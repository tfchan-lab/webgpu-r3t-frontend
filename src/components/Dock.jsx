import React, { useState } from "react";
import { FloatingDock } from "./Dock/floating-dock";
import { SummaryIcon, ReloadIcon, ClearLogIcon, ExportIcon } from "./Glyph";

const Dock = ({ pastOutputs, setPastOutputs, reloadModel, summary, setSummary, setTokenSpent, chatEndpoint, chatKey }) => {
    const [showReloadCard, setShowReloadCard] = useState(false);
    const [showClearCard, setShowClearCard] = useState(false);
    const [showAckCard, setShowAckCard] = useState(false);
    const [showLogCard, setShowLogCard] = useState(false);
    const [showSumCard, setShowSumCard] = useState(false);

    const clearAllPastOutputs = () => {
        setPastOutputs([]);
    };

    const getLogTXT = () => {
        if (pastOutputs.length === 0) return;

        const logText = pastOutputs.map((item) => item.sentence).join("\n");
        const blob = new Blob([logText], { type: "text/plain" });

        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "notetaker_log.txt";

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
	
    const getSummarization = async () => {
        if (pastOutputs.length === 0) return;

        const logText = pastOutputs.map((item) => item.sentence).join("\n");
        const promptPrefix = import.meta.env.VITE_CHAT_PROMPT;
        const prompt = `${promptPrefix} "${logText}"`;

        const endpoint = chatEndpoint !== '' ? "https://" + chatEndpoint : import.meta.env.VITE_CHAT_API_ENDPOINT;
        const apiKey = chatKey !== '' ? chatKey : import.meta.env.VITE_CHAT_API_KEY;
        const deploymentName = import.meta.env.VITE_CHAT_API_DEPLOYMENT_NAME;
        const apiVersion = import.meta.env.VITE_CHAT_API_VERSION;

		let requesting = false; // Lock
		
		if (!requesting) {
			requesting = true;
			try {
				const response = await fetch(
					`${endpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=${apiVersion}`,
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${apiKey}`,
						},
						body: JSON.stringify({
							messages: [
								{
									role: "user",
									content: prompt,
								},
							],
							max_tokens: 1000, // Dynamic limit can be implemented
							temperature: 0.2,
						}),
					}
				);

				if (!response.ok) {
					throw new Error(`API request failed with status ${response.status}`); // Do not expose the error to user
				}

				const data = await response.json();
				const summary = data.choices[0]?.message?.content;
				const tokenConsumption = data.usage?.total_tokens || 0;

				if (summary) {
					setSummary(summary);
					setTokenSpent(tokenConsumption);
				} else {
					throw new Error("[App] No summary found in the response");
				}
			} catch (error) {
				console.error("[App] Error summarizing log"); // Do not expose the error to user
				setSummary("Failed to summarize the log. Please try again.");
			}
		}
    };

    const getSummaryTXT = (fileType) => {
        if (!summary) return;

        const blob = new Blob([summary], { type: "text/plain" });

        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
		// Provide .TXT & .MD options
		switch (fileType) {
			case 'txt':
				link.download = "notetaker_summary.txt";
				break;
			case 'md':
				link.download = "notetaker_summary.md";
				break;
			case 'json': // Experimental for Agent, not necessary to end-users
				// TODO: Directly route `getSummarization` to here for this experimental feature
				link.download = "notetaker_summary.json";
				break;
			default:
				link.download = "notetaker_summary.txt";
				break;
		}

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleClick = (card) => {
        switch (card) {
            case "reload":
                setShowReloadCard(true);
                break;
            case "clear":
                setShowClearCard(true);
                break;
            case "ack":
                setShowAckCard(true);
                break;
            case "log":
                setShowLogCard(true);
                break;
            case "sum":
                setShowSumCard(true);
                break;
            default:
                console.log("If you see this message, a card is not properly set up");
                break;
        }
    };

    const closeCardAnimation = (cardId) => {
        const card = document.getElementById(cardId);
        card.classList.add("motion-scale-out-0");
        card.classList.add("motion-duration-1000/scale");
        card.classList.add("motion-opacity-out-0");
        card.classList.add("motion-duration-125/opacity");
    };

    const handleAccept = (card, fileType = 'txt') => {
        switch (card) {
            case "reload":
                setShowReloadCard(false);
                reloadModel();
                break;
            case "clear":
                closeCardAnimation("ClearCard");
                setTimeout(() => {
                    setShowClearCard(false);
                }, 125);
                clearAllPastOutputs();
                break;
            case "ack":
                closeCardAnimation("AckCard");
                setTimeout(() => {
                    setShowAckCard(false);
                }, 125);
                getSummarization();
                break;
            case "log":
                closeCardAnimation("LogCard");
                setTimeout(() => {
                    setShowLogCard(false);
                }, 125);
                getLogTXT();
                break;
            case "sum":
                closeCardAnimation("SumCard");
                setTimeout(() => {
                    setShowSumCard(false);
                }, 125);
                getSummaryTXT(fileType);
                break;
            default:
                break;
        }
    };

    const handleCancel = (card) => {
        switch (card) {
            case "reload":
                closeCardAnimation("ReloadCard");
                setTimeout(() => {
                    setShowReloadCard(false);
                }, 125);
                break;
            case "clear":
                closeCardAnimation("ClearCard");
                setTimeout(() => {
                    setShowClearCard(false);
                }, 125);
                break;
            case "ack":
                closeCardAnimation("AckCard");
                setTimeout(() => {
                    setShowAckCard(false);
                }, 125);
                break;
            case "log":
                closeCardAnimation("LogCard");
                setTimeout(() => {
                    setShowLogCard(false);
                }, 125);
                break;
            case "sum":
                closeCardAnimation("SumCard");
                setTimeout(() => {
                    setShowSumCard(false);
                }, 125);
                break;
            default:
                break;
        }
    };

	const navigationItems = [
        {
            label: "Reload Model",
            icon: <ReloadIcon />,
            onClick: () => handleClick("reload"),
        },
        {
            label: "Clear History",
            icon: <ClearLogIcon />,
            onClick: () => handleClick("clear"),
        },
        {
            label: "Summarize",
            icon: <SummaryIcon />,
            onClick: () => handleClick("ack"),
        },
        {
            label: "Save History",
            icon: <ExportIcon />,
            onClick: () => handleClick("log"),
        },
        {
            label: "Save Summary",
            icon: <ExportIcon />,
            onClick: () => handleClick("sum"),
        },
    ];

    return (
        <div className="flex justify-end">
            <FloatingDock
                navigationItems={navigationItems}
                desktopClassName="text-xl"
                mobileClassName="text-md"
            />

            {/* Pop-up prompt card for Reloading Model */}
            {showReloadCard && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-0 z-50 motion-scale-in-50 motion-duration-500/scale" id="ReloadCard">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-1">
							Reload Model
						</h2>
                        <p className="mb-4">
                            Do you want to reload the local models? Your translation history will be saved.
                            <br />
                            (This can be helpful if a model worker running in background is unresponsive after running for
                            a long period.)
                        </p>
                        <div className="flex justify-end gap-4">
                            <button
                                className="px-4 py-2 bg-red-500 rounded-lg hover:bg-red-400"
                                onClick={() => handleCancel("reload")}
                            >
                                Cancel
                            </button>
                            <button
                                className="px-4 py-2 bg-blue-500 dark:text-white rounded-lg hover:bg-blue-600"
                                onClick={() => handleAccept("reload")}
                            >
                                Reload
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Pop-up prompt card for Clearing History */}
            {showClearCard && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-0 z-50 motion-scale-in-50 motion-duration-500/scale" id="ClearCard">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-1">
							Clear History
						</h2>
                        <p className="mb-4">
                            Do you want to clear all translation history? This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-4">
                            <button
                                className="px-4 py-2 bg-red-500 rounded-lg hover:bg-red-400"
                                onClick={() => handleCancel("clear")}
                            >
                                Cancel
                            </button>
                            <button
                                className="px-4 py-2 bg-blue-500 dark:text-white rounded-lg hover:bg-blue-600"
                                onClick={() => handleAccept("clear")}
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Pop-up prompt card for Data Acknowledgment */}
            {showAckCard && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-0 z-50 motion-scale-in-50 motion-duration-500/scale" id="AckCard">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md">
                        <h2 className="text-xl font-bold mb-4">Data Acknowledgment</h2>
                        <p className="mb-4">
                            To use the summarization feature, your data will be sent to Azure cloud services. Do you
                            accept?
                        </p>
                        <div className="flex justify-end gap-4">
                            <button
                                className="px-4 py-2 bg-red-500 rounded-lg hover:bg-red-400"
                                onClick={() => handleCancel("ack")}
                            >
                                Cancel
                            </button>
                            <button
                                className="px-4 py-2 bg-blue-500 dark:text-white rounded-lg hover:bg-blue-600"
                                onClick={() => handleAccept("ack")}
                            >
                                Accept
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Pop-up prompt card for Saving log */}
            {showLogCard && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-0 z-50 motion-scale-in-50 motion-duration-500/scale" id="LogCard">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md">
                        <h2 className="text-xl font-bold mb-4">Save History</h2>
                        <p className="mb-4">Do you want to save current translation history to a .TXT file?</p>
                        <div className="flex justify-end gap-4">
                            <button
                                className="px-4 py-2 bg-red-500 rounded-lg hover:bg-red-400"
                                onClick={() => handleCancel("log")}
                            >
                                Cancel
                            </button>
                            <button
                                className="px-4 py-2 bg-blue-500 dark:text-white rounded-lg hover:bg-blue-600"
                                onClick={() => handleAccept("log")}
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Pop-up prompt card for Saving summary */}
            {showSumCard && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-0 z-50 motion-scale-in-50 motion-duration-500/scale" id="SumCard">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md">
                        <h2 className="text-xl font-bold mb-4">Save Summary</h2>
                        <p className="mb-4">Do you want to save current summary to a file?</p>
                        <div className="flex justify-end gap-4">
                            <button
                                className="px-4 py-2 bg-red-500 rounded-lg hover:bg-red-400"
                                onClick={() => handleCancel("sum")}
                            >
                                Cancel
                            </button>
                            <button
                                className="px-4 py-2 bg-blue-500 dark:text-white rounded-lg hover:bg-blue-600"
                                onClick={() => handleAccept("sum", 'txt')}
                            >
                                Save as .TXT
                            </button>
							<button
                                className="px-4 py-2 bg-blue-500 dark:text-white rounded-lg hover:bg-blue-600"
                                onClick={() => handleAccept("sum", 'md')}
                            >
                                Save as .MD
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dock;