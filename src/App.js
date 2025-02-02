import React, { useState, useRef, useEffect } from 'react';
import { Container, Button, Spinner, Nav, NavItem, NavLink, TabContent, TabPane } from 'reactstrap';
import { getTokenOrRefresh } from './token_util';
import './custom.css';
import { ResultReason } from 'microsoft-cognitiveservices-speech-sdk';
import { FaInfoCircle, FaMicrophone } from 'react-icons/fa';

const speechsdk = require('microsoft-cognitiveservices-speech-sdk');

export default function App() {
    // Application state variables
    const [conversations, setConversations] = useState([]); // Stores transcription conversations
    const [insights, setInsights] = useState([]); // Stores insights provided by LLM
    const [summaries, setSummaries] = useState([]); // Stores summaries provided by LLM
    const [activeTab, setActiveTab] = useState('insights'); // Controls the active tab in the insights box
    const [loading, setLoading] = useState(false); // Manages loading state for API calls
    const [isMicrophoneActive, setIsMicrophoneActive] = useState(false); // Tracks if the microphone is active
    const [isPushToTalkActive, setIsPushToTalkActive] = useState(false); // Tracks if push-to-talk is active

    const transcriberRef = useRef(null); // Reference for the Conversation Transcriber instance
    let fullTranscript = ''; // Accumulates the full transcription text

    // Toggles between "Insights" and "Summary" tabs
    const toggleTab = (tab) => {
        if (activeTab !== tab) setActiveTab(tab);
    };

    // Handles push-to-talk using spacebar
    useEffect(() => {
        const handleKeyDown = async (event) => {
            if (event.code === 'Space' && !isPushToTalkActive) {
                setIsPushToTalkActive(true);
                await pushToTalkStart();
            }
        };

        const handleKeyUp = async (event) => {
            if (event.code === 'Space' && isPushToTalkActive) {
                setIsPushToTalkActive(false);
                await pushToTalkStop();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [isPushToTalkActive]);

    // Formats the current time for timestamping microphone input
    function getCurrentTime() {
        const now = new Date();
        return now.toTimeString().substr(0, 8); // Extracts time as HH:MM:SS
    }

    // Formats ticks into HH:MM:SS for audio file input
    function formatTicks(ticks) {
        const milliseconds = Math.floor(ticks / 10000);
        const date = new Date(milliseconds);
        return date.toISOString().substr(11, 8); // Formats as HH:MM:SS
    }

    // Fetches insights from the LLM based on the transcription
    async function fetchInsights(updatedTranscript) {
        setLoading(true);
        try {
            const response = await fetch('/api/get-llm-insights', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ transcription: updatedTranscript }),
            });

            if (response.ok) {
                const data = await response.json();
                setInsights(prev => [...prev, {
                    shortInsight: data.shortInsight,
                    detailedInsight: data.detailedInsight,
                    expanded: false,
                }]);
            } else {
                console.error('Failed to fetch insights:', response.statusText);
                setInsights(prev => [...prev, {
                    shortInsight: 'Error fetching insights',
                    detailedInsight: 'Please try again later.',
                    expanded: false,
                }]);
            }
        } catch (error) {
            console.error('Error:', error);
            setInsights(prev => [...prev, {
                shortInsight: 'Error fetching insights',
                detailedInsight: 'Please check your connection.',
                expanded: false,
            }]);
        } finally {
            setLoading(false);
        }
    }

    // Toggles the expansion state of an insight entry for detailed view
    const toggleInsight = (index) => {
        setInsights((prev) =>
            prev.map((insight, i) =>
                i === index ? { ...insight, expanded: !insight.expanded } : insight
            )
        );
    };

    // Fetches summaries from the LLM based on the transcription
    async function fetchSummary(updatedTranscript) {
        setLoading(true);
        try {
            const response = await fetch('/api/get-llm-summary', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ transcription: updatedTranscript }),
            });

            if (response.ok) {
                const data = await response.json();
                setSummaries(prev => [...prev, {
                    shortSummary: data.shortSummary,
                    detailedSummary: data.detailedSummary,
                    expanded: false, // Controls whether the detailed summary is shown
                }]);
            } else {
                console.error('Failed to fetch summary:', response.statusText);
                setSummaries(prev => [...prev, {
                    shortSummary: 'Error fetching summary',
                    detailedSummary: 'Please try again later.',
                    expanded: false,
                }]);
            }
        } catch (error) {
            console.error('Error:', error);
            setSummaries(prev => [...prev, {
                shortSummary: 'Error fetching summary',
                detailedSummary: 'Please check your connection.',
                expanded: false,
            }]);
        } finally {
            setLoading(false);
        }
    }

    // Toggles the expansion state of an summary entry for detailed view
    const toggleSummary = (index) => {
        setSummaries((prev) =>
            prev.map((summary, i) =>
                i === index ? { ...summary, expanded: !summary.expanded } : summary
            )
        );
    };

    // Handles new transcriptions and updates the conversation list
    async function handleTranscription(transcript, timestamp) {
        const formattedEntry = {
            text: transcript,
            timestamp: timestamp,
        };
        setConversations(prev => [...prev, formattedEntry]);
        fullTranscript += `\n${timestamp} - ${transcript}`;
        await fetchInsights(fullTranscript);
        await fetchSummary(fullTranscript);
    }

    // Starts speech recognition using the microphone
    async function startRecognition() {
        setIsMicrophoneActive(true);
        const tokenObj = await getTokenOrRefresh();
        const speechConfig = speechsdk.SpeechConfig.fromAuthorizationToken(tokenObj.authToken, tokenObj.region);
        speechConfig.speechRecognitionLanguage = 'en-US';

        const audioConfig = speechsdk.AudioConfig.fromDefaultMicrophoneInput();
        const conversationTranscriber = new speechsdk.ConversationTranscriber(speechConfig, audioConfig);
        transcriberRef.current = conversationTranscriber;

        conversationTranscriber.sessionStarted = (s, e) => {
            console.log("Session started:", e.sessionId);
        };
        conversationTranscriber.sessionStopped = (s, e) => {
            console.log("Session stopped:", e.sessionId);
            conversationTranscriber.stopTranscribingAsync(() => {
                transcriberRef.current = null;
                setIsMicrophoneActive(false);
            });
        };
        conversationTranscriber.canceled = (s, e) => {
            console.log("Canceled:", e.errorDetails);
            conversationTranscriber.stopTranscribingAsync(() => {
                transcriberRef.current = null;
                setIsMicrophoneActive(false);
            });
        };

        conversationTranscriber.transcribed = async (s, e) => {
            if (e.result.reason === ResultReason.RecognizedSpeech) {
                const currentTime = getCurrentTime();
                const transcript = `Speaker ${e.result.speakerId}: ${e.result.text}`;
                await handleTranscription(transcript, currentTime);
            } else {
                setConversations(prev => [...prev, { text: 'ERROR: Speech not recognized. Ensure your microphone is working properly.', timestamp: '' }]);
            }
        };

        conversationTranscriber.startTranscribingAsync(
            () => console.log('Transcription started'),
            err => {
                console.error('Error starting transcription:', err);
                setIsMicrophoneActive(false);
                transcriberRef.current = null;
            }
        );
    }

    // Stops the ongoing speech recognition session
    async function stopRecognition() {
        if (transcriberRef.current) {
            transcriberRef.current.stopTranscribingAsync(
                () => {
                    console.log('Transcription stopped');
                    setConversations(prev => [...prev, { text: 'Stopped listening.', timestamp: '' }]);
                    setIsMicrophoneActive(false);
                    transcriberRef.current = null;
                },
                err => console.error('Error stopping transcription:', err)
            );
        } else {
            console.log('No active recognition session to stop.');
            setIsMicrophoneActive(false);
        }
    }

    // Handles push-to-talk events
    async function pushToTalkStart() {
        console.log('Push-to-Talk started');
        await startRecognition();
    }

    async function pushToTalkStop() {
        console.log('Push-to-Talk stopped');
        await stopRecognition();
    }
    
    // Handles file uploads for transcription
    async function fileChange(event) {
        const audioFile = event.target.files[0];
        const fileInfo = `Processing file: ${audioFile.name} (size: ${audioFile.size} bytes)`;
        setConversations(prev => [...prev, { text: fileInfo, timestamp: '' }]);

        const tokenObj = await getTokenOrRefresh();
        const speechConfig = speechsdk.SpeechConfig.fromAuthorizationToken(tokenObj.authToken, tokenObj.region);
        speechConfig.speechRecognitionLanguage = 'en-US';

        const audioConfig = speechsdk.AudioConfig.fromWavFileInput(audioFile);
        const conversationTranscriber = new speechsdk.ConversationTranscriber(speechConfig, audioConfig);

        conversationTranscriber.sessionStarted = (s, e) => {
            console.log("Session started:", e.sessionId);
        };
        conversationTranscriber.sessionStopped = (s, e) => {
            console.log("Session stopped:", e.sessionId);
            conversationTranscriber.stopTranscribingAsync();
        };
        conversationTranscriber.canceled = (s, e) => {
            console.log("Canceled:", e.errorDetails);
            conversationTranscriber.stopTranscribingAsync();
        };

        conversationTranscriber.transcribed = async (s, e) => {
            if (e.result.reason === ResultReason.RecognizedSpeech) {
                const timestamp = formatTicks(e.result.offset);
                const transcript = `Speaker ${e.result.speakerId}: ${e.result.text}`;
                await handleTranscription(transcript, timestamp);
            } else {
                setConversations(prev => [...prev, { text: 'ERROR: Could not recognize speech from the audio file.', timestamp: '' }]);
            }
        };

        conversationTranscriber.startTranscribingAsync(
            () => console.log('File transcription started'),
            err => console.error('Error starting file transcription:', err)
        );
    }

    return (
        <Container className="app-container">
            <div className="main-content">
                <div className="left-box">
                    <div className="header">
                        <Button color="success" onClick={startRecognition} className="mr-2" title="Start listening for speech">Start Recognition</Button>
                        <Button color="danger" onClick={stopRecognition} className="mr-2" title="Stop listening for speech">Stop Recognition</Button>
                        <label htmlFor="audio-file" className="btn btn-primary" title="Upload an audio file for transcription">
                            Upload File
                        </label>
                        <FaMicrophone
                            className={`microphone-icon ${isMicrophoneActive ? 'active' : ''}`}
                            title="Microphone status"
                        />
                        <input 
                            type="file" 
                            id="audio-file" 
                            onChange={(e) => fileChange(e)} 
                            style={{ display: 'none' }} 
                        />
                        {loading && <Spinner color="primary" className="ml-3" />}
                    </div>
                    <div className="output-display conversation-box">
                        {conversations.map((entry, index) => (
                            <div key={index} className={`conversation-entry ${index % 2 === 0 ? 'left' : 'right'}`}>
                                <p>{entry.text}</p>
                                <span className="timestamp">{entry.timestamp}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="insight-container">
                    {/* Navigation Tabs */}
                    <Nav tabs>
                        <NavItem>
                            <NavLink
                                className={activeTab === 'insights' ? 'active' : ''}
                                onClick={() => toggleTab('insights')}
                            >
                                Insights
                            </NavLink>
                        </NavItem>
                        <NavItem>
                            <NavLink
                                className={activeTab === 'summary' ? 'active' : ''}
                                onClick={() => toggleTab('summary')}
                            >
                                Summary
                            </NavLink>
                        </NavItem>
                    </Nav>

                    {/* Scrollable Content */}
                    <div className="insight-box">
                        <TabContent activeTab={activeTab}>
                            <TabPane tabId="insights">
                                {insights.map((insight, index) => (
                                    <div key={index} className="insight-entry">
                                        <div className="insight-header">
                                            <p><strong>{insight.shortInsight}</strong></p>
                                            <FaInfoCircle
                                                className="info-icon"
                                                onClick={() => toggleInsight(index)}
                                                title="Show more details"
                                            />
                                        </div>
                                        {insight.expanded && (
                                            <div className="detailed-insight">
                                                <p>{insight.detailedInsight}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </TabPane>
                            <TabPane tabId="summary">
                                {summaries.map((summary, index) => (
                                    <div key={index} className="summary-entry">
                                        <div className="summary-header">
                                            <p><strong>{summary.shortSummary}</strong></p>
                                            <FaInfoCircle
                                                className="info-icon"
                                                onClick={() => toggleSummary(index)}
                                                title="Show more details"
                                            />
                                        </div>
                                        {summary.expanded && (
                                            <div className="detailed-summary">
                                                <p>{summary.detailedSummary}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </TabPane>
                        </TabContent>
                    </div>
                </div>
            </div>
        </Container>
    );
}