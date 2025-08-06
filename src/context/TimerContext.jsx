import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const TimerContext = createContext();

export const useTimer = () => {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
};

export const TimerProvider = ({ children }) => {
  const [totalSeconds, setTotalSeconds] = useState(() => {
    return parseInt(localStorage.getItem('timerTotalSeconds')) || 25 * 60;
  });
  const [seconds, setSeconds] = useState(() => {
    return parseInt(localStorage.getItem('timerSeconds')) || 25 * 60;
  });
  const [isActive, setIsActive] = useState(() => {
    return localStorage.getItem('timerIsActive') === 'true';
  });
  const [isRinging, setIsRinging] = useState(() => {
    return localStorage.getItem('timerIsRinging') === 'true';
  });
  
  // Track completed sessions for streak calculation
  const [completedSessions, setCompletedSessions] = useState(() => {
    return JSON.parse(localStorage.getItem('completedSessions')) || [];
  });

  const audioRef = useRef(null);
  const ringingIntervalRef = useRef(null);
  const timerIntervalRef = useRef(null);

  // Create continuous ringing sound
  useEffect(() => {
    const createRingingSound = () => {
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        const playBeep = () => {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
          oscillator.type = 'sine';
          
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
          
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.5);
        };

        return playBeep;
      } catch (error) {
        console.log("Audio not supported");
        return () => {};
      }
    };

    audioRef.current = createRingingSound();
  }, []);

  // Handle continuous ringing
  useEffect(() => {
    if (isRinging) {
      ringingIntervalRef.current = setInterval(() => {
        if (audioRef.current) {
          audioRef.current();
        }
      }, 1000); // Ring every second
    } else {
      if (ringingIntervalRef.current) {
        clearInterval(ringingIntervalRef.current);
        ringingIntervalRef.current = null;
      }
    }

    return () => {
      if (ringingIntervalRef.current) {
        clearInterval(ringingIntervalRef.current);
      }
    };
  }, [isRinging]);

  // Persist timer state to localStorage
  useEffect(() => {
    localStorage.setItem('timerTotalSeconds', totalSeconds.toString());
  }, [totalSeconds]);

  useEffect(() => {
    localStorage.setItem('timerSeconds', seconds.toString());
  }, [seconds]);

  useEffect(() => {
    localStorage.setItem('timerIsActive', isActive.toString());
  }, [isActive]);

  useEffect(() => {
    localStorage.setItem('timerIsRinging', isRinging.toString());
  }, [isRinging]);

  // Persist completed sessions
  useEffect(() => {
    localStorage.setItem('completedSessions', JSON.stringify(completedSessions));
  }, [completedSessions]);

  // Function to track completed session
  const trackCompletedSession = () => {
    const today = new Date().toDateString();
    const newSession = {
      date: today,
      timestamp: new Date().toISOString(),
      duration: totalSeconds
    };
    
    setCompletedSessions(prev => {
      const todaySessions = prev.filter(session => session.date === today);
      const otherSessions = prev.filter(session => session.date !== today);
      return [...otherSessions, ...todaySessions, newSession];
    });
  };

  // Calculate study streak based on daily timer sessions
  const calculateStudyStreak = () => {
    if (completedSessions.length === 0) return 0;
    
    const today = new Date();
    let streak = 0;
    let currentDate = new Date(today);
    
    // Check each day going backwards
    while (true) {
      const dateString = currentDate.toDateString();
      const sessionsForDate = completedSessions.filter(session => session.date === dateString);
      
      if (sessionsForDate.length > 0) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        // If it's today and no sessions yet, don't break streak
        if (dateString === today.toDateString()) {
          currentDate.setDate(currentDate.getDate() - 1);
          continue;
        }
        break;
      }
    }
    
    return streak;
  };

  // Timer logic with persistence - this runs globally
  useEffect(() => {
    if (isActive && seconds > 0 && !isRinging) {
      timerIntervalRef.current = setInterval(() => {
        setSeconds((prev) => {
          const newSeconds = prev - 1;
          if (newSeconds === 0) {
            setIsActive(false);
            setIsRinging(true);
            // Track completed session for streak calculation
            trackCompletedSession();
            // Show browser notification if permission is granted
            if (Notification.permission === 'granted') {
              new Notification('StudyBuddy Timer', {
                body: 'Timer completed! 🎉 Streak updated!',
                icon: '/vite.svg'
              });
            }
          }
          return newSeconds;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
    
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isActive, seconds, isRinging, totalSeconds]);

  // Request notification permission on mount
  useEffect(() => {
    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }, []);

  const startTimer = () => {
    if (isRinging) {
      stopRinging();
    } else {
      setIsActive(!isActive);
    }
  };

  const resetTimer = () => {
    setIsActive(false);
    setSeconds(totalSeconds);
    stopRinging();
  };

  const stopRinging = () => {
    setIsRinging(false);
    setSeconds(totalSeconds); // Reset to original time
  };

  const setTimerTime = (minutes, seconds = 0) => {
    const newTotalSeconds = (minutes * 60) + seconds;
    if (newTotalSeconds > 0) {
      setTotalSeconds(newTotalSeconds);
      setSeconds(newTotalSeconds);
      setIsActive(false);
      stopRinging();
    }
  };

  // Format time as MM:SS
  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const remainingSeconds = time % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  // Calculate progress percentage
  const progressPercentage = ((totalSeconds - seconds) / totalSeconds) * 100;
  
  // Get current study streak
  const studyStreak = calculateStudyStreak();
  
  // Get today's completed sessions count
  const todaySessionsCount = completedSessions.filter(
    session => session.date === new Date().toDateString()
  ).length;

  const value = {
    totalSeconds,
    seconds,
    isActive,
    isRinging,
    progressPercentage,
    studyStreak,
    todaySessionsCount,
    completedSessions,
    startTimer,
    resetTimer,
    stopRinging,
    setTimerTime,
    formatTime,
    calculateStudyStreak
  };

  return (
    <TimerContext.Provider value={value}>
      {children}
    </TimerContext.Provider>
  );
};
