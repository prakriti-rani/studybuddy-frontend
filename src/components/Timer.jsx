import React, { useState } from "react";
import { FaPlay, FaPause, FaRedo, FaCog, FaStop } from "react-icons/fa";
import { useTimer } from "../context/TimerContext";

const Timer = () => {
  const {
    totalSeconds,
    seconds,
    isActive,
    isRinging,
    progressPercentage,
    startTimer,
    resetTimer,
    stopRinging,
    setTimerTime,
    formatTime
  } = useTimer();

  const [isSettingTime, setIsSettingTime] = useState(false);
  const [inputMinutes, setInputMinutes] = useState(25);
  const [inputSeconds, setInputSeconds] = useState(0);

  const handleSetTime = () => {
    if (inputMinutes > 0 || inputSeconds > 0) {
      setTimerTime(inputMinutes, inputSeconds);
      setIsSettingTime(false);
    }
  };

  const handlePresetTime = (minutes) => {
    setTimerTime(minutes, 0);
    setInputMinutes(minutes);
    setInputSeconds(0);
  };

  return (
    <div className="dashboard-card timer-card">
      <h2 className="card-title">Study Timer</h2>
      
      {/* Ringing Alert */}
      {isRinging && (
        <div className="timer-alert">
          <div className="alert-content">
            <h3>Timer Completed!</h3>
            <p>Click Stop to end the alarm</p>
            <button onClick={stopRinging} className="timer-button primary stop-btn">
              <FaStop /> Stop Alarm
            </button>
          </div>
        </div>
      )}
      
      {!isSettingTime ? (
        <>
          <div className="timer-display">
            <div className="timer-circle">
              <svg width="150" height="150" className="timer-progress">
                <circle
                  cx="75"
                  cy="75"
                  r="70"
                  stroke="#e5e5e5"
                  strokeWidth="4"
                  fill="none"
                />
                <circle
                  cx="75"
                  cy="75"
                  r="70"
                  stroke={isRinging ? "#446dffff" : "#3b82f6"}
                  strokeWidth="4"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 70}`}
                  strokeDashoffset={`${2 * Math.PI * 70 * (1 - progressPercentage / 100)}`}
                  className={`timer-progress-bar ${isRinging ? 'ringing' : ''}`}
                />
              </svg>
              <span className={`timer-time ${isRinging ? 'ringing' : ''}`}>
                {isRinging ? "00:00" : formatTime(seconds)}
              </span>
            </div>
          </div>
          
          <div className="timer-controls">
            {isRinging ? (
              <button
                onClick={stopRinging}
                className="timer-button primary stop-btn"
                aria-label="Stop Alarm"
              >
                <FaStop />
              </button>
            ) : (
              <>
                <button
                  onClick={startTimer}
                  className="timer-button primary"
                  aria-label={isActive ? "Pause Timer" : "Start Timer"}
                >
                  {isActive ? <FaPause /> : <FaPlay />}
                </button>
                <button
                  onClick={resetTimer}
                  className="timer-button"
                  aria-label="Reset Timer"
                >
                  <FaRedo />
                </button>
                <button
                  onClick={() => setIsSettingTime(true)}
                  className="timer-button"
                  aria-label="Set Time"
                >
                  <FaCog />
                </button>
              </>
            )}
          </div>

          {!isRinging && (
            <>
              <div className="timer-presets">
                <button onClick={() => handlePresetTime(5)} className="preset-btn">5min</button>
                <button onClick={() => handlePresetTime(15)} className="preset-btn">15min</button>
                <button onClick={() => handlePresetTime(25)} className="preset-btn">25min</button>
                <button onClick={() => handlePresetTime(45)} className="preset-btn">45min</button>
              </div>

              <p className="timer-text">
                {isActive ? "Stay focused!" : seconds === totalSeconds ? "Ready to start!" : "Paused"}
              </p>
            </>
          )}

          {isRinging && (
            <p className="timer-text ringing-text">
              Timer completed! The alarm will ring until you stop it.
            </p>
          )}
        </>
      ) : (
        <div className="timer-settings">
          <h3>Set Timer</h3>
          <div className="time-inputs">
            <div className="input-group">
              <label>Minutes</label>
              <input
                type="number"
                min="0"
                max="999"
                value={inputMinutes}
                onChange={(e) => setInputMinutes(parseInt(e.target.value) || 0)}
                className="time-input"
              />
            </div>
            <div className="input-group">
              <label>Seconds</label>
              <input
                type="number"
                min="0"
                max="59"
                value={inputSeconds}
                onChange={(e) => setInputSeconds(parseInt(e.target.value) || 0)}
                className="time-input"
              />
            </div>
          </div>
          <div className="settings-controls">
            <button onClick={handleSetTime} className="timer-button primary">
              Set Time
            </button>
            <button onClick={() => setIsSettingTime(false)} className="timer-button">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Timer;
