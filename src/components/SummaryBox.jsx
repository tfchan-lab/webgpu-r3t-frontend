import React, { useState } from "react";
import Dock from "./Dock";
import Markdown from 'react-markdown';
import { SentenceIcon, TokenIcon } from './Glyph';

const SummaryBox = ({
    status,
    pastOutputs,
    setPastOutputs,
	reloadModel,
	chatEndpoint,
	chatKey
}) => {
    const [showResultCard, setShowResultCard] = useState(false);
    const [summary, setSummary] = useState("");
    const [tokenSpent, setTokenSpent] = useState(0);

    if (status !== "ready") return null;

    // Delete a translation from past outputs
    const deletePastOutput = (index) => {
        setPastOutputs((prev) => prev.filter((_, i) => i !== index));
    };

    // Handle click for expanding the result card
    const handleClick = (card) => {
        switch (card) {
            case "result":
                setShowResultCard(true);
                break;
            default:
                console.log("[Dev] If you see this message, a card is not properly setup");
                break;
        }
    };

    // Handle cancel for closing the expanded result card
    const handleCancel = (card) => {
        switch (card) {
            case "result":
                const card = document.getElementById("SummaryCard");
				card.classList.add("motion-scale-out-0");
				card.classList.add("motion-duration-250/scale")
				card.classList.add("motion-translate-x-out-50")
				card.classList.add("motion-translate-y-out-50")
				card.classList.add("motion-duration-125/translate")
				card.classList.add("motion-opacity-out-0");
				card.classList.add("motion-duration-125/opacity")
				setTimeout(() => {
					setShowResultCard(false);
				}, 125)
				break;
                break;
            default:
				console.log("[Dev] If you see this message, a card is not properly setup");
                break;
        }
    };

    return (
        <div className="w-full p-2 column relative">
            {/* Translation History */}
            <div className="relative mb-4">
                <h3 className="text-l font-semibold">Translation History</h3>
                <div className="w-full h-[80px] overflow-y-auto overflow-wrap-anywhere border rounded-lg p-2">
                    {pastOutputs.map((item, index) => (
                        <div key={index} className="flex justify-between items-center">
                            <span>{item.sentence}</span>
                            <button onClick={() => deletePastOutput(index)}>⨯</button>
                        </div>
                    ))}
                    <span className="absolute bottom-1 right-1 px-1 text-sm bg-gray-100 dark:bg-gray-800 rounded flex items-center gap-1">
                        <SentenceIcon />
						Sentences: {pastOutputs.length}
                    </span>
                </div>
                <button
                    className="absolute top-1 right-1 px-1 text-sm bg-white dark:bg-gray-800 rounded"
                    onClick={() => handleClick("result")}
                >
                    ⛶
                </button>
            </div>

            {/* Summarization */}
			<div className="relative">
				<h3 className="text-l font-semibold">Summarization</h3>
				<div className="w-full h-[80px] overflow-y-auto overflow-wrap-anywhere border rounded-lg p-2">
					<div>
						<span>{summary}</span>
					</div>
					<span className="absolute bottom-1 right-1 px-1 text-sm bg-gray-100 dark:bg-gray-800 rounded flex items-center gap-1">
						<TokenIcon />
						Tokens Spent: {tokenSpent}
					</span>
				</div>
            </div>

            {/* Pop-up overlay for result text-area expanding */}
            {showResultCard && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-0 z-40 motion-scale-in-50 motion-duration-500/scale" id="SummaryCard">
                    <div
                        className="fixed bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg w-full"
                        style={{ height: "100%" }}
                    >
                        <div className="relative h-full">
                            {/* History box */}
                            <div className="relative mb-4 h-[45%]">
                                <h3 className="text-l font-semibold">Translation History</h3>
                                <div className="w-full h-[calc(100%-40px)] overflow-y-auto overflow-wrap-anywhere border rounded-lg p-2">
                                    {pastOutputs.map((item, index) => (
                                        <div key={index} className="flex justify-between items-center">
                                            <span>{item.sentence}</span>
                                            <button onClick={() => deletePastOutput(index)}>⨯</button>
                                        </div>
                                    ))}
                                    <span className="absolute bottom-5 right-1 px-1 text-sm bg-gray-100 dark:bg-gray-800 rounded">
                                        Sentences: {pastOutputs.length}
                                    </span>
                                </div>
                                <button
                                    className="absolute top-1 right-1 px-1 text-sm bg-white dark:bg-gray-800 rounded"
                                    onClick={() => handleCancel("result")}
                                >
                                    ⨯
                                </button>
                            </div>

                            {/* Summary box */}
                            <div className="relative h-[45%] mb-4">
                                <h3 className="text-l font-semibold">Summarization</h3>
                                <div className="w-full h-[calc(100%-40px)] overflow-y-auto overflow-wrap-anywhere border rounded-lg p-2">
                                    <div className="flex justify-center w-full"><div className="prose dark:prose-invert"><Markdown>{summary}</Markdown></div></div>
                                    <span className="absolute bottom-5 right-1 px-1 text-sm bg-gray-100 dark:bg-gray-800 rounded flex items-center gap-1">
                                        <TokenIcon />
										Tokens Spent: {tokenSpent}
                                    </span>
                                </div>
                            </div>
							
							{/* Button Dock */}
							<Dock
								pastOutputs={pastOutputs}
								setPastOutputs={setPastOutputs}
								reloadModel={reloadModel}
								summary={summary}
								setSummary={setSummary}
								setTokenSpent={setTokenSpent}
								chatEndpoint={chatEndpoint}
								chatKey={chatKey}
							/>
                        </div>
                    </div>
                </div>
            )}
			
			{/* Button Dock */}
			<Dock
				pastOutputs={pastOutputs}
				setPastOutputs={setPastOutputs}
				reloadModel={reloadModel}
				summary={summary}
				setSummary={setSummary}
				setTokenSpent={setTokenSpent}
				chatEndpoint={chatEndpoint}
				chatKey={chatKey}
			/>
        </div>
    );
};

export default SummaryBox;