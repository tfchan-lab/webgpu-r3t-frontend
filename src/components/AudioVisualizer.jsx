import { useRef, useCallback, useEffect, useState } from "react";
import { MicrophoneIcon } from "./Glyph";

export function AudioVisualizer({ stream, decibel, dbOffset, setDbOffset, ...props }) {
    const canvasRef = useRef(null);
    const [isDarkMode, setIsDarkMode] = useState(false);

    // Check the theme state after the initial render
    useEffect(() => {
        setIsDarkMode(document.documentElement.classList.contains('dark'));
    }, []);

    // Observe changes to the dark mode class
    useEffect(() => {
        const observer = new MutationObserver(() => {
            setIsDarkMode(document.documentElement.classList.contains('dark'));
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class'],
        });

        return () => observer.disconnect();
    }, []);

    const visualize = useCallback((stream) => {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);

        const canvas = canvasRef.current;
        const canvasCtx = canvas.getContext('2d');
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const drawVisual = () => {
            requestAnimationFrame(drawVisual);
            analyser.getByteTimeDomainData(dataArray);

            // Set background and line colors based on theme
            canvasCtx.fillStyle = isDarkMode ? 'rgb(31, 41, 55)' : 'rgb(243, 244, 246)'; // Background: gray-800 for dark, gray-100 for light
            canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

            canvasCtx.lineWidth = 2;
            canvasCtx.strokeStyle = isDarkMode ? 'rgb(255, 255, 255)' : 'rgb(0, 0, 0)'; // Lines: white for dark, black for light
            canvasCtx.beginPath();

            const sliceWidth = canvas.width * 1.0 / bufferLength;

            let x = 0;
            for (let i = 0; i < bufferLength; ++i) {
                const v = dataArray[i] / 128.0;
                const y = v * canvas.height / 2;

                if (i === 0) {
                    canvasCtx.moveTo(x, y);
                } else {
                    canvasCtx.lineTo(x, y);
                }

                x += sliceWidth;
            }

            canvasCtx.lineTo(canvas.width, canvas.height / 2);
            canvasCtx.stroke();
        };

        drawVisual();
    }, [isDarkMode]);

    useEffect(() => {
        stream && visualize(stream);
    }, [visualize, stream]);

    return (
        <div className="relative">
            <canvas {...props} width={720} height={240} ref={canvasRef}></canvas>
            {decibel !== null && (
                <>
                    <span className="absolute bottom-1 right-1 px-1 text-sm bg-gray-100 dark:bg-gray-800 rounded flex items-center gap-1">
                        <MicrophoneIcon />
						Volume: {decibel !== null ? decibel.toFixed(2) : '-∞'}dB
                    </span>
                    <div className="absolute bottom-1 left-1 px-1 text-sm bg-gray-100 dark:bg-gray-800 rounded">
                        <label htmlFor="dbOffset" className="block text-xs">Sensitivity: {dbOffset}dB</label>
                        <input
                            id="dbOffset"
                            type="range"
                            min="0"
                            max="100"
                            value={dbOffset}
                            onChange={(e) => setDbOffset(Number(e.target.value))}
                            className="w-24 accent-gray-700"
                        />
                    </div>
                </>
            )}
        </div>
    );
}