import React, { useState, useEffect } from "react";
import axios from "axios";
import { BookOpen, CheckSquare, Upload, Loader, MessageCircle } from "lucide-react";
import { useAuth } from "@clerk/clerk-react";
import ReactMarkdown from "react-markdown";

// API Configuration
const AI_SERVER_URL = import.meta.env.VITE_AI_SERVER_URL || "http://127.0.0.1:5000";

function Aiapp() {
  const { getToken } = useAuth();
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTab, setCurrentTab] = useState("summary");
  const [summaryData, setSummaryData] = useState(null);
  const [flashcardsData, setFlashcardsData] = useState([]);
  const [activeFlashcard, setActiveFlashcard] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [finalAnswer, setFinalAnswer] = useState("");
  
  // Chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);

  useEffect(() => {
    console.log("Flashcards data updated:", flashcardsData);
  }, [flashcardsData]);

  // Check server status on component mount
  useEffect(() => {
    const checkServerStatus = async () => {
      try {
        console.log("Checking server status...");
        const response = await axios.get(`${AI_SERVER_URL}/`);
        console.log("AI Server is running:", response.data);
        setSummaryData("✅ AI Server is connected and ready!");
      } catch (error) {
        console.error("AI Server connection failed:", error);
        setSummaryData(`❌ AI Server is not running. Cannot connect to ${AI_SERVER_URL}.\n\nPlease check if the AI server is deployed and running.`);
      }
    };
    
    checkServerStatus();
  }, []);

  const parseFlashcards = (flashcardsString) => {
    console.log("Raw flashcards string:", flashcardsString);
    try {
      const flashcards = [];
      
      // Try multiple parsing patterns
      // Pattern 1: "Flashcard 1:\nQuestion: ...\nAnswer: ..."
      let flashcardBlocks = flashcardsString
        .split(/Flashcard \d+:\s*/gi)
        .filter((block) => block.trim());

      if (flashcardBlocks.length === 0) {
        // Pattern 2: Split by double newlines or Question/Answer pairs
        flashcardBlocks = flashcardsString
          .split(/\n\n+/)
          .filter((block) => block.includes("Question") && block.includes("Answer"));
      }

      console.log("Flashcard blocks:", flashcardBlocks);
      
      flashcardBlocks.forEach((block, index) => {
        // Try to match Question: ... Answer: ... pattern
        let match = block.match(/Question:\s*(.*?)\s*Answer:\s*(.*)/is);
        
        if (!match) {
          // Try alternative patterns
          match = block.match(/Q:\s*(.*?)\s*A:\s*(.*)/is);
        }
        
        if (!match) {
          // Try Front/Back pattern
          match = block.match(/Front:\s*(.*?)\s*Back:\s*(.*)/is);
        }
        
        console.log(`Processing block ${index}:`, block, "Match result:", match);
        
        if (match) {
          flashcards.push({
            question: match[1].trim(),
            answer: match[2].trim(),
          });
        }
      });
      
      console.log("Parsed flashcards:", flashcards);
      
      return flashcards.length > 0
        ? flashcards
        : [{ question: "No flashcards parsed", answer: "The AI response format could not be parsed. Please try again." }];
    } catch (error) {
      console.error("Error parsing flashcards:", error);
      return [{ question: "Error parsing", answer: "Processing failed: " + error.message }];
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setFileName(selectedFile.name);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      console.log("No file selected");
      setSummaryData("Please select a file first.");
      return;
    }
    
    console.log("Starting file upload for:", file.name, "Size:", file.size, "Type:", file.type);
    setIsUploading(true);
    setSummaryData("Uploading document..."); // Show upload status
    setFlashcardsData([]); // Clear previous flashcards
    
    const formData = new FormData();
    formData.append("file", file);
    
    console.log("FormData created, entries:");
    for (let [key, value] of formData.entries()) {
      console.log(key, value);
    }

    try {
      // Temporarily remove authorization for testing
      console.log("Uploading file to AI server (without auth for testing)...");
      
      const response = await axios.post(
        `${AI_SERVER_URL}/upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            // Removed Authorization header for testing
          },
          timeout: 60000, // 60 second timeout for large files
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            console.log(`Upload progress: ${percentCompleted}%`);
            setSummaryData(`Uploading document... ${percentCompleted}%`);
          }
        }
      );
      
      console.log("Upload response:", response.data);
      console.log("Upload status:", response.status);
      setIsUploading(false);
      
      // Show success message
      setSummaryData("Document uploaded successfully! Processing summary...");
      
      // Automatically start processing
      setTimeout(() => {
        handleGenerateSummary();
      }, 1000); // Small delay to show the success message
      
    } catch (error) {
      console.error("Upload error:", error);
      console.error("Upload error details:", error.response?.data);
      console.error("Upload error status:", error.response?.status);
      console.error("Upload error message:", error.message);
      
      setIsUploading(false);
      
      let errorMessage = "Upload failed: ";
      if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
        errorMessage += "Cannot connect to AI server. Please ensure the Flask server is running on port 5000.";
      } else if (error.response?.status === 500) {
        errorMessage += `Server error: ${error.response?.data?.details || error.response?.data?.error || error.message}`;
      } else {
        errorMessage += error.response?.data?.error || error.message;
      }
      
      setSummaryData(errorMessage);
    }
  };

  const handleGenerateSummary = async () => {
    setIsProcessing(true);
    console.log("Starting summary generation...");
    
    try {
      // Temporarily remove authorization for testing
      console.log("Making request to summary endpoint (without auth for testing)...");
      
      const response = await axios.post(`${AI_SERVER_URL}/summary`, null, {
        headers: {
          // Removed Authorization header for testing
        },
        timeout: 30000, // 30 second timeout
      });
      
      console.log("Summary response received:", response.data);
      
      // Handle the response correctly based on Flask server response format
      const summaryText = response.data.summary || response.data.response || "No summary generated";
      console.log("Processed summary text:", summaryText);
      
      setSummaryData(summaryText);
      setFinalAnswer(summaryText);
      setCurrentTab("summary");
    } catch (error) {
      console.error("Error generating summary:", error);
      console.error("Error details:", error.response?.data);
      console.error("Error status:", error.response?.status);
      console.error("Error message:", error.message);
      
      // Show more specific error messages
      let errorMessage = "Failed to generate summary. ";
      
      if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
        errorMessage += "Cannot connect to AI server. Please ensure the Flask server is running on port 5000.";
      } else if (error.response?.status === 400) {
        errorMessage += error.response.data?.error || "Bad request - document may not be uploaded properly.";
      } else if (error.response?.status === 500) {
        errorMessage += error.response.data?.error || "Server error - check server logs.";
      } else {
        errorMessage += error.response?.data?.error || error.message;
      }
      
      setSummaryData(errorMessage);
      setFinalAnswer(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateFlashcards = async () => {
    setIsProcessing(true);
    try {
      const token = await getToken();
      console.log("Generating flashcards...");
      const response = await axios.post(
        `${AI_SERVER_URL}/flashcards`,
        null,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      console.log("Flashcards response:", response.data);
      
      const flashcardsStr =
        typeof response.data === "string"
          ? response.data
          : response.data.flashcards || "";
          
      console.log("Flashcards string to parse:", flashcardsStr);
      
      const parsedFlashcards = parseFlashcards(flashcardsStr);
      console.log("Parsed flashcards:", parsedFlashcards);
      
      if (parsedFlashcards.length > 0 && parsedFlashcards[0].question !== "No flashcards parsed") {
        setFlashcardsData(parsedFlashcards);
        setFinalAnswer((prev) => prev + flashcardsStr);
        setActiveFlashcard(0);
        setShowAnswer(false);
        setCurrentTab("flashcards");
      } else {
        throw new Error("No flashcards could be parsed from the response");
      }
    } catch (error) {
      console.error("Error generating flashcards:", error);
      console.error("Error details:", error.response?.data);
      
      // Set error message instead of sample data
      setFlashcardsData([{
        question: "Error generating flashcards",
        answer: error.response?.data?.error || "Could not connect to AI server. Please ensure the server is running."
      }]);
      setCurrentTab("flashcards");
    } finally {
      setIsProcessing(false);
    }
  };

  const nextFlashcard = () => {
    if (activeFlashcard < flashcardsData.length - 1) {
      setActiveFlashcard(activeFlashcard + 1);
      setShowAnswer(false);
    }
  };

  const prevFlashcard = () => {
    if (activeFlashcard > 0) {
      setActiveFlashcard(activeFlashcard - 1);
      setShowAnswer(false);
    }
  };

  const toggleAnswer = () => setShowAnswer(!showAnswer);

  // Chat function
  const handleSendChatMessage = async () => {
    if (!chatInput.trim()) return;

    const userMessage = { type: 'user', content: chatInput.trim() };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput("");
    setIsChatLoading(true);

    try {
      const response = await axios.post(`${AI_SERVER_URL}/chat`, {
        message: userMessage.content
      });

      const aiResponse = { type: 'ai', content: response.data.response };
      setChatMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorResponse = { 
        type: 'ai', 
        content: "Sorry, I couldn't process your question. Please make sure the AI server is running and try again." 
      };
      setChatMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleChatKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendChatMessage();
    }
  };

  const clearChatHistory = () => {
    setChatMessages([]);
  };

  const mockSummaryData = {
    summary:
      "No document processed yet. Please upload a document and click 'Process Document' to generate a summary.",
  };

  const displaySummary = summaryData || mockSummaryData.summary;

  return (
    <div className="aiapp-page">
      <section className="aiapp-section">
        <h1 className="aiapp-title">StudyBuddy AI</h1>
        <p className="aiapp-subtitle">
          Enhance your study with AI-powered tools
        </p>

        {/* Upload Section */}
        <div className="upload-card">
          <div className="upload-content">
            <div
              className="upload-dropzone"
              onClick={() => document.getElementById("fileInput").click()}
            >
              <input
                type="file"
                id="fileInput"
                className="hidden-file-input"
                accept=".pdf,.docx,.txt"
                onChange={handleFileChange}
              />
              <Upload className="upload-icon" />
              {fileName ? (
                <p className="upload-file-name">{fileName}</p>
              ) : (
                <>
                  <p className="upload-instruction">
                    Click to upload a document
                  </p>
                  <p className="upload-filetypes">PDF, DOCX, or TXT</p>
                </>
              )}
            </div>
            <button
              className={`action-button ${
                !file || isUploading ? "disabled" : ""
              }`}
              onClick={handleUpload}
              disabled={!file || isUploading}
            >
              {isUploading ? (
                <span className="flex items-center justify-center">
                  <Loader className="animate-spin h-5 w-5 mr-2" />
                  Uploading...
                </span>
              ) : (
                "Process Document"
              )}
            </button>
          </div>
        </div>

        {/* Tools Menu */}
        <div className="tools-menu">
          <button
            className={`tool-button ${
              currentTab === "summary" ? "active" : ""
            }`}
            onClick={handleGenerateSummary}
          >
            <BookOpen className="tool-icon" /> Summary
          </button>
          <button
            className={`tool-button ${
              currentTab === "flashcards" ? "active" : ""
            }`}
            onClick={handleGenerateFlashcards}
          >
            <CheckSquare className="tool-icon" /> Flashcards
          </button>
          <button
            className={`tool-button ${
              currentTab === "chat" ? "active" : ""
            }`}
            onClick={() => setCurrentTab("chat")}
          >
            <MessageCircle className="tool-icon" /> Chat
          </button>
        </div>

        {/* Loading State */}
        {isProcessing && (
          <div className="loading-container">
            <Loader className="loading-icon animate-spin" />
            <p className="loading-text">Processing your document...</p>
          </div>
        )}

        {/* Content Area */}
        {!isProcessing && (
          <div className="content-card">
            {/* Summary Tab */}
            {currentTab === "summary" && (
              <div className="summary-content">
                <h2 className="content-title">Document Summary</h2>
                <p className="content-text">{displaySummary}</p>
              </div>
            )}

            {/* Flashcards Tab */}
            {currentTab === "flashcards" && flashcardsData.length > 0 && (
              <div className="flashcards-content">
                <h2 className="content-title">Flashcards</h2>
                <div className="flashcard-card">
                  <p className="flashcard-question">
                    {activeFlashcard < flashcardsData.length
                      ? flashcardsData[activeFlashcard].question
                      : "No question available"}
                  </p>
                  {showAnswer && activeFlashcard < flashcardsData.length && (
                    <p className="flashcard-answer">
                      {flashcardsData[activeFlashcard].answer}
                    </p>
                  )}
                  <button className="action-button" onClick={toggleAnswer}>
                    {showAnswer ? "Hide Answer" : "Show Answer"}
                  </button>
                </div>
                <div className="flashcard-navigation">
                  <button
                    className={`nav-button ${
                      activeFlashcard === 0 ? "disabled" : ""
                    }`}
                    onClick={prevFlashcard}
                    disabled={activeFlashcard === 0}
                  >
                    Previous
                  </button>
                  <span className="flashcard-counter">
                    {activeFlashcard + 1} of {flashcardsData.length}
                  </span>
                  <button
                    className={`nav-button ${
                      activeFlashcard >= flashcardsData.length - 1
                        ? "disabled"
                        : ""
                    }`}
                    onClick={nextFlashcard}
                    disabled={activeFlashcard >= flashcardsData.length - 1}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {/* Empty State for Flashcards */}
            {currentTab === "flashcards" && flashcardsData.length === 0 && (
              <div className="no-content">
                <p className="no-content-title">No flashcards available</p>
                <p className="no-content-text">
                  Click the Flashcards button to generate flashcards from your
                  document
                </p>
              </div>
            )}

            {/* Chat Content */}
            {currentTab === "chat" && (
              <div className="content-card">
                <h2 className="content-title">AI Doubt Solver</h2>
                <div className="chat-container">
                  <div className="chat-messages">
                    {chatMessages.length === 0 ? (
                      <div className="no-content">
                        <p className="no-content-title">Ask me anything!</p>
                        <p className="no-content-text">
                          I'm here to help with your study questions, explain concepts, solve problems, and more.
                        </p>
                      </div>
                    ) : (
                      chatMessages.map((message, index) => (
                        <div key={index} className={`chat-message ${message.type}`}>
                          <div className="message-content">
                            {message.type === 'ai' ? (
                              <ReactMarkdown>{message.content}</ReactMarkdown>
                            ) : (
                              message.content
                            )}
                          </div>
                        </div>
                      ))
                    )}
                    {isChatLoading && (
                      <div className="chat-message ai">
                        <div className="message-content">
                          <Loader className="loading-icon animate-spin" />
                          Thinking...
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="chat-input-container">
                    <textarea
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyPress={handleChatKeyPress}
                      placeholder="Ask a question... (Press Enter to send)"
                      className="chat-input"
                      rows="2"
                    />
                    <div className="chat-buttons">
                      <button
                        onClick={clearChatHistory}
                        disabled={chatMessages.length === 0}
                        className="chat-clear-button"
                        title="Clear chat history"
                      >
                        Clear
                      </button>
                      <button
                        onClick={handleSendChatMessage}
                        disabled={!chatInput.trim() || isChatLoading}
                        className="chat-send-button"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default Aiapp;
