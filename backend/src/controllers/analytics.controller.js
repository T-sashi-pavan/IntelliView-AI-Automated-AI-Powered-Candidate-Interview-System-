import Session from '../models/session.model.js';
import Interview from '../models/interview.model.js';
import User from '../models/user.model.js';

export const getRecruiterAnalytics = async (req, res) => {
  try {
    const recruiterId = req.user._id;

    const [totalInterviews, totalCandidates, sessions, recentSessions] = await Promise.all([
      Interview.countDocuments({ recruiter: recruiterId }),
      Session.countDocuments({ recruiter: recruiterId }),
      Session.find({ recruiter: recruiterId }).select('overallScore createdAt'),
      Session.find({ recruiter: recruiterId })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('candidate', 'name email')
        .populate('interview', 'title'),
    ]);

    const avgScore = sessions.length > 0
      ? Math.round(sessions.reduce((sum, s) => sum + s.overallScore, 0) / sessions.length)
      : 0;

    const activeSessions = await Session.countDocuments({ recruiter: recruiterId, status: 'in-progress' });

    // Score distribution
    const scoreDistribution = [
      { range: '0-20', count: sessions.filter(s => s.overallScore <= 20).length },
      { range: '21-40', count: sessions.filter(s => s.overallScore > 20 && s.overallScore <= 40).length },
      { range: '41-60', count: sessions.filter(s => s.overallScore > 40 && s.overallScore <= 60).length },
      { range: '61-80', count: sessions.filter(s => s.overallScore > 60 && s.overallScore <= 80).length },
      { range: '81-100', count: sessions.filter(s => s.overallScore > 80).length },
    ];

    // Monthly trends (last 6 months)
    const monthlyTrends = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const start = new Date(date.getFullYear(), date.getMonth(), 1);
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      const monthSessions = sessions.filter(s => s.createdAt >= start && s.createdAt <= end);
      monthlyTrends.push({
        month: start.toLocaleString('default', { month: 'short' }),
        interviews: monthSessions.length,
        avgScore: monthSessions.length > 0 ? Math.round(monthSessions.reduce((sum, s) => sum + s.overallScore, 0) / monthSessions.length) : 0,
      });
    }

    return res.json({
      success: true,
      stats: { totalInterviews, totalCandidates, avgScore, activeSessions },
      scoreDistribution,
      monthlyTrends,
      recentSessions,
    });
  } catch (err) {
    console.error('Analytics error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

export const getCandidateAnalytics = async (req, res) => {
  try {
    const candidateId = req.user._id;
    const sessions = await Session.find({ candidate: candidateId, status: 'completed' })
      .populate('interview', 'title');

    const totalInterviews = sessions.length;
    const avgScore = totalInterviews > 0
      ? Math.round(sessions.reduce((sum, s) => sum + s.overallScore, 0) / totalInterviews)
      : 0;

    const allSessions = await Session.find({ status: 'completed' }).sort({ overallScore: -1 });
    const myBestScore = Math.max(...sessions.map(s => s.overallScore), 0);
    const rank = allSessions.findIndex(s => s.candidate.toString() === candidateId.toString()) + 1 || null;

    return res.json({
      success: true,
      stats: {
        totalInterviews,
        avgScore,
        rank: rank || 'N/A',
        bestScore: myBestScore,
      },
      sessions: sessions.slice(0, 5),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};
export const getLeaderboard = async (req, res) => {
  try {
    const recruiterId = req.user._id;
    const interviews = await Interview.find({ recruiter: recruiterId }).select('_id title');
    
    const leaderboard = await Promise.all(interviews.map(async (intv) => {
      const sessions = await Session.find({ interview: intv._id, status: 'completed' })
        .populate('candidate', 'name email avatar')
        .select('candidate overallScore completedAt')
        .sort({ overallScore: -1 });
      return {
        interviewId: intv._id,
        title: intv.title,
        totalCandidates: sessions.length,
        avgScore: sessions.length > 0 ? Math.round(sessions.reduce((s, x) => s + x.overallScore, 0) / sessions.length) : 0,
        candidates: sessions.map((s, i) => ({
          rank: i + 1,
          candidateId: s.candidate?._id,
          name: s.candidate?.name,
          email: s.candidate?.email,
          avatar: s.candidate?.avatar,
          score: s.overallScore,
          completedAt: s.completedAt,
        }))
      };
    }));
    
    return res.json({ success: true, leaderboard });
  } catch (err) {
    console.error('Leaderboard error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};
