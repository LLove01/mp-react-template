// PoseDetection.js
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { drawLandmarks } from '@mediapipe/drawing_utils';
import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import './App.css';


const PoseDetection = () => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const containerRef = useRef(null);

    const [poseLandmarker, setPoseLandmarker] = useState(null);
    const [cameraActive, setCameraActive] = useState(false);

    const toggleCamera = useCallback(() => {
        if (cameraActive) {
            // Turning the camera off
            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject;
                const tracks = stream.getTracks();

                tracks.forEach((track) => {
                    track.stop(); // This line stops each track
                });

                videoRef.current.srcObject = null; // Clear the srcObject to release the stream
            }

            // Exit fullscreen when turning the camera off
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(err => {
                    console.error(`Error attempting to disable full-screen mode: ${err.message} (${err.name})`);
                });
            }
        } else {
            // Attempt to enter full-screen and start camera stream
            if (containerRef.current) {
                containerRef.current.requestFullscreen().catch(err => {
                    console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
                });
            }

            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                navigator.mediaDevices.getUserMedia({
                    video: {
                        aspectRatio: 16 / 9,
                        width: { ideal: 1280 },
                        frameRate: { ideal: 60 },
                    }
                })
                    .then(stream => {
                        if (videoRef.current) {
                            videoRef.current.srcObject = stream;
                            // Access the video track's settings to log the frame rate
                            const videoTrack = stream.getVideoTracks()[0]; // Assuming you're interested in the first video track
                            const trackSettings = videoTrack.getSettings();
                            console.log(`Actual frame rate: ${trackSettings.frameRate}`);
                        }
                    })
                    .catch(err => {
                        console.error(`Error accessing the camera: ${err}`);
                    });
            }
        }

        setCameraActive(!cameraActive);
    }, [cameraActive]);

    // Add an effect to listen for fullscreen changes
    useEffect(() => {
        function handleFullscreenChange() {
            if (!document.fullscreenElement && cameraActive) {
                toggleCamera(); // Toggle camera off when exiting fullscreen
            }
        }

        document.addEventListener('fullscreenchange', handleFullscreenChange);

        // Cleanup the event listener on component unmount
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, [cameraActive, toggleCamera]);


    useEffect(() => {
        const loadModel = async () => {
            const vision = await FilesetResolver.forVisionTasks(
                'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
            );
            const plm = await PoseLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
                    delegate: 'GPU'
                },
                runningMode: 'VIDEO',
                numPoses: 2,
            });
            setPoseLandmarker(plm);
        };
        loadModel();
    }, []);

    useEffect(() => {
        const predictWebcam = () => {
            if (!poseLandmarker || !cameraActive) return;

            const videoElement = videoRef.current;
            const canvasElement = canvasRef.current;
            const canvasCtx = canvasElement.getContext('2d');


            const drawPose = async () => {
                if (!canvasElement || !videoElement) {
                    console.log("Canvas or video element is not available.");
                    return;
                }

                if (videoElement.readyState >= 2 && videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
                    canvasElement.width = videoElement.videoWidth;
                    canvasElement.height = videoElement.videoHeight;

                    // Clear the canvas
                    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

                    await poseLandmarker.detectForVideo(videoElement, performance.now(), (results) => {
                        console.log("Landmarks:", results.landmarks);

                        if (results.landmarks && results.landmarks.length > 0 && results.landmarks[0].length > 0) {
                            const landmarks = results.landmarks[0]; // Assuming the first array contains the landmarks we want to draw

                            drawLandmarks(canvasCtx, landmarks, { color: '#1F51FF', fillColor: '#D3D3D3', lineWidth: 2, radius: 5 });
                        } else {
                            console.log("No landmarks detected or incorrect results structure.");
                        }
                    });
                } else {
                    console.log("Video not ready or size is zero.");
                }

                // Keep the animation loop going
                requestAnimationFrame(drawPose);
            };



            // Initial call to start the loop
            drawPose();

        };

        predictWebcam();
    }, [poseLandmarker, cameraActive]);

    return (
        <div className="App" ref={containerRef}>
            <div className="fullscreen-container">
                <button className="enable-webcam-button" onClick={toggleCamera}>
                    {cameraActive ? 'Disable Webcam' : 'Enable Webcam'}
                </button>
                <div className="video-container">
                    {cameraActive && (
                        <>
                            <video ref={videoRef} className="input-video" autoPlay playsInline muted ></video>
                            <canvas ref={canvasRef} className="output-canvas"></canvas>

                        </>
                    )}

                </div>
            </div>
        </div >


    );

};

export default PoseDetection;