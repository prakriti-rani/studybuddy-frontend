import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { FaTrash, FaPlus, FaCheck, FaRobot, FaSatellite } from "react-icons/fa";
import { documentStore } from "../pages/UploadDocuments";
import CalendarSection from "../components/CalenderSection";
import Timer from "../components/Timer";
import { useTimer } from "../context/TimerContext";

const Dashboard = () => {
  const navigate = useNavigate();
  const { userId: clerkUserId } = useAuth();
  const { studyStreak, todaySessionsCount } = useTimer();
  
  const [recentUploads, setRecentUploads] = useState([]);
  const [affirmation, setAffirmation] = useState("");
  const [todos, setTodos] = useState([]);
  const [notes, setNotes] = useState([]);
  const [newTodo, setNewTodo] = useState("");
  const [progress, setProgress] = useState({
    documents: 0,
    completedTodos: 0,
    notes: 0,
    completedPomodoros: 0,
    events: 0,
    streak: 0,
  });
  const [studyProgress, setStudyProgress] = useState(0);

  const affirmations = [
    "You're capable of amazing things!",
    "Every small step counts toward your goal.",
    "Learning is a journey, not a destination.",
    "Your effort today builds tomorrow's success.",
    "Stay curious and keep growing!",
  ];

  // Fetch data on component mount
  useEffect(() => {
    if (!clerkUserId) return;

    const fetchDocuments = async () => {
      try {
        const response = await fetch("http://localhost:5001/api/documents");
        if (!response.ok)
          throw new Error(`HTTP error! Status: ${response.status}`);
        const documents = await response.json();
        setRecentUploads(documents.slice(-5));
      } catch (err) {
        console.error("Error fetching documents:", err.message);
      }
    };

    const fetchTodos = async () => {
      try {
        const response = await fetch(
          `http://localhost:5001/api/todos/${clerkUserId}`
        );
        if (!response.ok)
          throw new Error(`HTTP error! Status: ${response.status}`);
        const todosData = await response.json();
        setTodos(todosData);
      } catch (err) {
        console.error("Error fetching todos:", err.message);
      }
    };

    const fetchNotes = async () => {
      try {
        const response = await fetch(
          `http://localhost:5001/api/notes/${clerkUserId}`
        );
        if (!response.ok)
          throw new Error(`HTTP error! Status: ${response.status}`);
        const notesData = await response.json();
        setNotes(notesData);
      } catch (err) {
        console.error("Error fetching notes:", err.message);
      }
    };

    const fetchProgress = async () => {
      try {
        const response = await fetch(
          `http://localhost:5001/api/progress/${clerkUserId}`
        );
        if (!response.ok)
          throw new Error(`HTTP error! Status: ${response.status}`);
        const progressData = await response.json();
        setProgress(progressData);
      } catch (err) {
        console.error("Error fetching progress:", err.message);
      }
    };

    fetchDocuments();
    fetchTodos();
    fetchNotes();
    fetchProgress();

    const randomIndex = Math.floor(Math.random() * affirmations.length);
    setAffirmation(affirmations[randomIndex]);
  }, [clerkUserId]);

  // Calculate study progress based on task completion rate
  useEffect(() => {
    const calculateStudyProgress = () => {
      const totalTodos = todos.length;
      const completedTodos = todos.filter((todo) => todo.isCompleted).length;
      
      let progressPercentage = 0;
      if (totalTodos > 0) {
        progressPercentage = Math.round((completedTodos / totalTodos) * 100);
      }

      setStudyProgress(progressPercentage);

      updateProgressInDatabase({
        documents: recentUploads.length,
        completedTodos,
        notes: notes.length,
        completedPomodoros: progress.completedPomodoros,
        events: progress.events,
        totalTodos,
        progressPercentage,
      });
    };

    const updateProgressInDatabase = async (metrics) => {
      try {
        await fetch(`http://localhost:5001/api/progress/${clerkUserId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(metrics),
        });
      } catch (err) {
        console.error("Error updating progress in database:", err.message);
      }
    };

    if (clerkUserId) calculateStudyProgress();
  }, [recentUploads, todos, notes, progress.completedPomodoros, progress.events, clerkUserId]);

  const handleAddTodo = async () => {
    if (!newTodo.trim()) return;

    const todo = {
      todoId: Date.now(),
      title: newTodo,
      isCompleted: false,
      userId: clerkUserId,
    };

    try {
      const response = await fetch("http://localhost:5001/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(todo),
      });
      if (!response.ok) throw new Error("Failed to add todo");

      setTodos((prev) => [...prev, todo]);
      setNewTodo("");
    } catch (err) {
      console.error("Error adding todo:", err.message);
    }
  };

  const toggleTodo = async (todoId, currentStatus) => {
    try {
      const response = await fetch(
        `http://localhost:5001/api/todos/${todoId}/toggle`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isCompleted: !currentStatus }),
        }
      );
      if (!response.ok) throw new Error("Failed to toggle todo");

      setTodos((prev) =>
        prev.map((todo) =>
          todo.todoId === todoId
            ? { ...todo, isCompleted: !currentStatus }
            : todo
        )
      );
    } catch (err) {
      console.error("Error toggling todo:", err.message);
    }
  };

  const deleteTodo = async (todoId) => {
    try {
      const response = await fetch(`http://localhost:5001/api/todos/${todoId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete todo");

      setTodos((prev) => prev.filter((todo) => todo.todoId !== todoId));
    } catch (err) {
      console.error("Error deleting todo:", err.message);
    }
  };

  const handleFileClick = (docId) => {
    navigate(`/file/${docId}`);
  };

  const handleGoToUpload = () => {
    navigate("/upload-documents");
  };

  const handleGoToAI = () => {
    navigate("/ai");
  };

  const handlePomodoroComplete = () => {
    // This can be used for additional pomodoro tracking if needed
    console.log("Pomodoro completed!");
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div className="affirmation-banner">
          <p className="affirmation-text">{affirmation}</p>
        </div>
      </div>

      <div className="dashboard-container">
        <div className="dashboard-sidebar">
          <div className="dashboard-card uploads-card">
            <h2 className="card-title">Recent Uploads</h2>
            {recentUploads.length > 0 ? (
              <ul className="uploads-list">
                {recentUploads.map((doc) => (
                  <li
                    key={doc.id}
                    className="upload-item"
                    onClick={() => handleFileClick(doc.id)}
                  >
                    <span className="upload-name">{doc.name}</span>
                    <span className="upload-date">{doc.date}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="no-files-text">No recent uploads</p>
            )}
            <button className="action-button" onClick={handleGoToUpload}>
              Upload New Document
            </button>
          </div>

          <div className="dashboard-card todo-card">
            <h2 className="card-title">To-Do List</h2>
            <div className="todo-input">
              <input
                type="text"
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
                placeholder="Add a new task..."
                className="todo-input-field"
                onKeyPress={(e) => e.key === "Enter" && handleAddTodo()}
              />
              <button className="add-todo-button" onClick={handleAddTodo}>
                <FaPlus />
              </button>
            </div>
            <ul className="todo-list">
              {todos.map((todo) => (
                <li key={todo.todoId} className="todo-item">
                  <button
                    className={`todo-check ${todo.isCompleted ? "completed" : ""}`}
                    onClick={() => toggleTodo(todo.todoId, todo.isCompleted)}
                  >
                    {todo.isCompleted ? <FaCheck /> : ""}
                  </button>
                  <span
                    className={`todo-text ${todo.isCompleted ? "completed" : ""}`}
                  >
                    {todo.title}
                  </span>
                  <button
                    className="delete-button"
                    onClick={() => deleteTodo(todo.todoId)}
                  >
                    <FaTrash />
                  </button>
                </li>
              ))}
            </ul>
            {todos.length === 0 && (
              <p className="no-todos-text">No tasks yet. Add one above!</p>
            )}
          </div>
        </div>

        <div className="dashboard-main">
          <div className="progress-and-calendar-container">
            <div className="dashboard-card progress-card">
              <h2 className="card-title">Study Progress</h2>
              <div className="progress-circle-container">
                <svg
                  className="progress-ring"
                  width="120"
                  height="120"
                  viewBox="0 0 120 120"
                >
                  <circle
                    className="progress-ring__background"
                    cx="60"
                    cy="60"
                    r="50"
                    strokeWidth="10"
                    fill="transparent"
                  />
                  <circle
                    className="progress-ring__fill"
                    cx="60"
                    cy="60"
                    r="50"
                    strokeWidth="10"
                    strokeDasharray="314"
                    strokeDashoffset={314 * (1 - studyProgress / 100)}
                  />
                </svg>
                <span className="progress-percentage">{studyProgress}%</span>
              </div>
              <p className="progress-text">
                Task completion: {todos.filter(t => t.isCompleted).length}/{todos.length} todos completed
              </p>
            </div>

            <Timer onPomodoroComplete={handlePomodoroComplete} />

            <div className="dashboard-card streak-card">
              <h2 className="card-title">Study Streak</h2>
              <div className="streak-display">
                <span className="streak-value">{studyStreak}</span>
                <span className="streak-text">days</span>
              </div>
              <p className="streak-text">
                Complete at least 1 timer session daily to keep your streak alive!
              </p>
              <p className="streak-text">
                Today's sessions: {todaySessionsCount}
              </p>
            </div>
          </div>

          <div className="dashboard-card ai-tools-card">
            <h2 className="card-title">AI Study Tools</h2>
            <p className="ai-tools-text">
              Transform your documents into study materials with AI-powered tools
            </p>
            <button className="action-button ai-tools-button" onClick={handleGoToAI}>
              <FaSatellite />
              Explore AI Tools
            </button>
          </div>

          <CalendarSection clerkUserId={clerkUserId} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
