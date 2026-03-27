import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as tf from '@tensorflow/tfjs';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';

export class ProctoringEngine {
  constructor(videoElement, onWarning, onStatusChange) {
    this.video = videoElement;
    this.onWarning = onWarning;
    this.onStatusChange = onStatusChange || (() => {});
    
    this.modelsLoaded = false;
    this.isProctoring = false;
    this.cocoModel = null;
    this.faceModel = null;
    
    // Config
    this.fps = 2; // Process 2 frames per second to save CPU
    this.intervalId = null;

    // Logging & Tracking
    this.events = [];
    this.totalSuspicionScore = 0;
    
    // State Tracking
    this.absentTimer = 0;
    this.multipersonTimer = 0;
    this.lookingAwayTimer = 0;
    this.lipSyncTimer = 0;
    
    // Audio Context
    this.audioContext = null;
    this.analyser = null;
    this.dataArray = null;
  }

  async initialize() {
    this.onStatusChange('Loading Proctoring AI Models...');
    
    await tf.setBackend('webgl');
    await tf.ready();
    
    // Load Coco-SSD (Objects: Person, Cell phone)
    this.cocoModel = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
    
    // Load Face Mesh for Gaze detection
    const faceModelInput = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
    const detectorConfig = {
      runtime: 'tfjs',
      refineLandmarks: false
    };
    this.faceModel = await faceLandmarksDetection.createDetector(faceModelInput, detectorConfig);

    this.modelsLoaded = true;
    this.onStatusChange('Proctoring AI Ready ✅');
  }

  start() {
    if (!this.modelsLoaded) return;
    this.isProctoring = true;
    this.absentTimer = 0;
    this.multipersonTimer = 0;
    this.lookingAwayTimer = 0;
    this.lipSyncTimer = 0;
    
    this.setupBrowserListeners();
    this.setupAudioAnalysis();

    // Start 2 FPS inference loop
    this.intervalId = setInterval(() => this.processFrame(), 1000 / this.fps);
  }

  setupAudioAnalysis() {
    try {
      const stream = this.video.srcObject;
      if (stream && stream.getAudioTracks().length > 0) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = this.audioContext.createMediaStreamSource(stream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        source.connect(this.analyser);
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      }
    } catch (e) {
      console.warn("Audio analysis setup failed:", e);
    }
  }

  stop() {
    this.isProctoring = false;
    if (this.intervalId) clearInterval(this.intervalId);
    this.teardownBrowserListeners();
    return this.generateReport();
  }

  setupBrowserListeners() {
    this.boundVisibility = () => {
      if (document.hidden) {
        this.logEvent('TAB_SWITCH', 3, 'High', 'Candidate switched tabs or minimized browser.');
      }
    };
    this.boundFullscreen = () => {
      if (!document.fullscreenElement) {
        this.logEvent('FULLSCREEN_EXIT', 2, 'Medium', 'Candidate exited fullscreen mode.');
      }
    };
    
    document.addEventListener('visibilitychange', this.boundVisibility);
    document.addEventListener('fullscreenchange', this.boundFullscreen);
  }

  teardownBrowserListeners() {
    document.removeEventListener('visibilitychange', this.boundVisibility);
    document.removeEventListener('fullscreenchange', this.boundFullscreen);
  }

  logEvent(type, penalty, riskLevel, message) {
    const timestamp = new Date().toISOString();
    this.totalSuspicionScore += penalty;
    const event = { type, timestamp, penalty, riskLevel, message };
    this.events.push(event);
    if (this.onWarning) this.onWarning(event, this.totalSuspicionScore);
  }

  async processFrame() {
    if (!this.isProctoring || this.video.readyState < 2) return;

    try {
      // 1. Coco SSD (Objects & Bodies)
      const objPredictions = await this.cocoModel.detect(this.video);
      
      let peopleCount = 0;
      let phoneDetected = false;

      objPredictions.forEach(pred => {
        if (pred.class === 'person' && pred.score > 0.5) peopleCount++;
        if (pred.class === 'cell phone' && pred.score > 0.5) phoneDetected = true;
      });

      // 2. Face Mesh (Gaze & Lips)
      const facePredictions = await this.faceModel.estimateFaces(this.video);
      let isLookingAway = false;
      let mouthOpenDistance = 0;

      if (facePredictions.length > 0) {
        const keypoints = facePredictions[0].keypoints;
        const nose = keypoints[1];
        const leftEye = keypoints[33];
        const rightEye = keypoints[263];
        const upperLip = keypoints[13];
        const lowerLip = keypoints[14];

        if (nose && leftEye && rightEye) {
            const eyeDist = Math.abs(leftEye.x - rightEye.x);
            const midEyeX = (leftEye.x + rightEye.x) / 2;
            const yawDiff = Math.abs(nose.x - midEyeX);
            if (yawDiff > eyeDist * 0.4) {
                isLookingAway = true;
            }
        }
        
        if (upperLip && lowerLip) {
            // Distance between inner upper lip and inner lower lip
            mouthOpenDistance = Math.abs(lowerLip.y - upperLip.y);
        }
      }
      
      // Audio Volume
      let volume = 0;
      if (this.analyser && this.dataArray) {
        this.analyser.getByteFrequencyData(this.dataArray);
        let sum = 0;
        for(let i = 0; i < this.dataArray.length; i++) {
          sum += this.dataArray[i];
        }
        volume = sum / this.dataArray.length;
      }
      this.recentVolume = volume;

      this.evaluateState(peopleCount, phoneDetected, facePredictions.length, isLookingAway, mouthOpenDistance, volume);

    } catch (err) {
      console.error('Proctoring Error:', err);
    }
  }

  evaluateState(peopleCount, phoneDetected, facesCount, isLookingAway, mouthOpenDistance, volume) {
    const timeStep = 1 / this.fps; // 0.5 seconds

    // Missing Person Check
    if (peopleCount === 0 && facesCount === 0) {
      this.absentTimer += timeStep;
      if (this.absentTimer > 3.0) { // 3 seconds absent
        this.logEvent('ABSENCE', 2, 'Medium', 'Candidate missing from camera frame.');
        this.absentTimer = 0; // reset to avoid spamming
      }
    } else {
      this.absentTimer = 0;
    }

    // Multiple People Check
    if (peopleCount > 1 || facesCount > 1) {
      this.multipersonTimer += timeStep;
      if (this.multipersonTimer > 1.0) { // Reduced to 1.0s to trigger faster
        this.logEvent('MULTIPLE_PEOPLE', 4, 'High', `Detected ${Math.max(peopleCount, facesCount)} people in frame.`);
        this.multipersonTimer = 0; // reset
      }
    } else {
      this.multipersonTimer = Math.max(0, this.multipersonTimer - timeStep);
    }

    // Lip Sync / External Voice Check
    // If volume is high (meaning someone is speaking into the mic) 
    // but the candidate's mouth is completely closed (< 3 pixels diff).
    if (volume > 20 && mouthOpenDistance < 4 && facesCount === 1) {
      this.lipSyncTimer += timeStep;
      if (this.lipSyncTimer > 3.0) { // 3 seconds of talking but mouth closed
        this.logEvent('LIP_SYNC_VIOLATION', 3, 'High', 'Audio detected but candidate mouth is not moving.');
        this.lipSyncTimer = 0;
      }
    } else {
      this.lipSyncTimer = 0;
    }

    // Mobile Phone Check
    if (phoneDetected) {
      this.logEvent('MOBILE_PHONE', 5, 'High', 'Mobile device detected in frame.');
    }

    // Gaze Check
    if (isLookingAway) {
      this.lookingAwayTimer += timeStep;
      if (this.lookingAwayTimer > 4.0) { // Looking away continously for 4 seconds
        this.logEvent('LOOKING_AWAY', 1, 'Mild', 'Candidate is repeatedly looking away from screen.');
        this.lookingAwayTimer = 0;
      }
    } else {
      this.lookingAwayTimer = 0;
    }
  }

  generateReport() {
    let finalRisk = 'Normal';
    if (this.totalSuspicionScore >= 3 && this.totalSuspicionScore < 7) finalRisk = 'Mild Suspicion';
    else if (this.totalSuspicionScore >= 7 && this.totalSuspicionScore < 12) finalRisk = 'Moderate Suspicion';
    else if (this.totalSuspicionScore >= 12) finalRisk = 'High Suspicion';

    return {
      totalScore: this.totalSuspicionScore,
      riskLevel: finalRisk,
      log: this.events,
      recommendation: finalRisk === 'High Suspicion' || finalRisk === 'Moderate Suspicion' ? 'Manual review recommended.' : 'Session passed AI proctoring securely.'
    };
  }

  getCurrentVolume() {
    return this.recentVolume || 0;
  }
}
