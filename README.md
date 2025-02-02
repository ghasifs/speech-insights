# Real-Time Speech Transcription and LLM Insights App

This project is a real-time speech transcription web application that leverages Azure Speech Services for transcription and OpenAI's GPT-4 model for generating insights and summaries from transcriptions. The app features microphone-based transcription, file uploads for pre-recorded audio, and a dual-tab interface for insights and conversation summaries.

---

## Features

- **Real-Time Speech Transcription**: Supports live transcription using a microphone.
- **File Uploads**: Process pre-recorded audio files for transcription.
- **LLM Integration**:
  - Provides insights on potentially harmful or unsafe behavior in conversations.
  - Generates concise summaries of the conversation.
- **Push-to-Talk**: Spacebar-based push-to-talk functionality for seamless interaction.
- **User-Friendly Interface**:
  - Dual-tab layout for insights and summaries.
  - Timestamped transcription entries.

---

## Technologies Used

- **Frontend**:
  - React.js for building a dynamic UI.
  - Reactstrap for component styling.
  - Custom CSS for theming and layout.
- **Backend**:
  - Node.js with Express.js for server-side logic.
  - Integration with Azure Cognitive Services for speech recognition with speech diarization.
  - OpenAI API for natural language insights and summaries.

---

## How to Run the App

1. Clone this repository and navigate to the project root:
   ```bash
   git clone <repo-url>
   cd virtual-try-on
   ```
2. Install the dependencies:
   ```bash
   npm install
   ```
3. Add your Azure Speech key and region to the `.env` file in the root directory:
   ```plaintext
   SPEECH_KEY=your-azure-speech-key
   SPEECH_REGION=your-azure-region
   OPENAI_API_KEY=your-openai-api-key
   ```
4. To run the Express server and React app together:
   ```bash
   npm run dev
   ```

---

## Project Structure

```
.
├── server/
│   └── index.js              # Express server implementation
├── src/
│   ├── App.js                # Main React application logic
│   ├── custom.css            # Custom styling for the application
│   └── token_util.js         # Helper functions for Azure token management
├── public/
│   └── index.html            # Base HTML file
├── .env                      # Environment variables
├── package.json              # Project dependencies and scripts
├── README.md                 # Project documentation
```

---

## Key Features Explained

### Insights
- Analyzes transcription data for harmful, critical, or unsafe behavior.
- Outputs concise (5-word) insights with detailed reasoning and evidence.

### Summary
- Summarizes conversations concisely and provides reasoning behind the summary.

### Push-to-Talk
- Enables users to hold the spacebar for real-time interaction without clicking.

### Timestamped Transcriptions
- Every transcription entry includes a timestamp for better context.

---

## API Endpoints

### `/api/get-speech-token`
- **Purpose**: Retrieves an Azure Speech Service token.
- **Response**: `{ token: string, region: string }`

### `/api/get-llm-insights`
- **Purpose**: Generates insights on transcriptions using OpenAI.
- **Request Body**:
  ```json
  { "transcription": "Your transcription text here." }
  ```
- **Response**:
  ```json
  {
    "shortInsight": "Brief insight",
    "detailedInsight": "Detailed explanation with evidence."
  }
  ```

### `/api/get-llm-summary`
- **Purpose**: Generates a summary of the conversation using OpenAI.
- **Request Body**:
  ```json
  { "transcription": "Your transcription text here." }
  ```
- **Response**:
  ```json
  {
    "shortSummary": "Brief summary",
    "detailedSummary": "Detailed explanation of the summary."
  }
  ```

## Project History

*This repository is being uploaded as a complete package with all files included from 2024. The project has evolved through several phases, incorporating new features and refinements to address the challenges of creating such an app.*

## Contributors

- Ghasif Syed