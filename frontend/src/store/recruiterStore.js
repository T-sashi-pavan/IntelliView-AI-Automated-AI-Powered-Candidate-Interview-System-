import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useRecruiterStore = create(
  persist(
    (set) => ({
      createInterviewForm: {
        title: '', jobDescription: '', requiredSkills: '',
        experienceLevel: 'mid', timePerQuestion: 60, numberOfQuestions: 10,
        stipend: '', jobDuration: '', employmentType: 'full-time', workMode: 'onsite'
      },
      interviewLink: '',
      interviewId: null,

      setForm: (update) => set((state) => ({
        createInterviewForm: typeof update === 'function' ? update(state.createInterviewForm) : { ...state.createInterviewForm, ...update }
      })),
      
      setInterviewData: (link, id) => set({ interviewLink: link, interviewId: id }),
      
      clearInterviewData: () => set({
        createInterviewForm: {
          title: '', jobDescription: '', requiredSkills: '',
          experienceLevel: 'mid', timePerQuestion: 60, numberOfQuestions: 10,
          stipend: '', jobDuration: '', employmentType: 'full-time', workMode: 'onsite'
        },
        interviewLink: '',
        interviewId: null
      })
    }),
    {
      name: 'recruiter-storage',
    }
  )
);
