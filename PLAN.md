# Project Summary: The Wizarding World Spellcaster

## What It Is
An interactive, browser-based digital installation for a Halloween open house. Users step in front of a screen holding a physical wand. When they speak a specific magic spell (e.g., "Expecto Patronum") and wave the wand, real-time particle visual effects corresponding to that spell emit from their hand/wand position on the screen.

## How It Works
The entire experience runs locally in a web browser to ensure fast rendering and offline stability. 
*   **Visual Tracking:** The device's webcam feeds into **MediaPipe Hands**, a pre-trained machine learning model that instantly maps 21 3D landmarks on the user's hand. We track the index finger or knuckles to serve as the emission point for the magic effects.
*   **Voice Recognition:** The microphone feeds into the browser's native **Web Speech API**, listening for specific trigger words (spells).
*   **Rendering Engine:** A custom **HTML5 Canvas** particle engine listens to both APIs. When a spell word is recognized, it triggers the visual effect. The effect continuously updates its X/Y coordinates on the screen based on the MediaPipe hand tracking data.

## What Was Done in Phase 1
*   **Concept Selection:** Pivoted from a basic motion-triggered video to a dynamic, multi-sensory experience combining both gesture tracking and voice recognition.
*   **Tech Stack Selection:** Selected MediaPipe (for lighting-resilient hand tracking) and the Web Speech API (for low-latency, browser-native voice commands). 

## Project Timeline (7 Days)
*   **Phase 1: Planning and Scoping (COMPLETED)**
*   **Phase 2: Prototyping & Core Logic (UP NEXT)** - Initialize the HTML/JS environment, connect the webcam, and get raw data flowing from MediaPipe and the Web Speech API.
*   **Phase 3: Visuals & Graphics** - Build the HTML5 Canvas particle engine and design unique effects for 2-3 different spells.
*   **Phase 4: Integration & State Management** - Link the voice triggers to the specific spell effects and map them to the hand coordinates. Add sound effects.
*   **Phase 5: Polish & Deployment** - Test in open house lighting/noise conditions, add a reset state between users, and set up full-screen kiosk mode.

## Current Status
**Point in Timeline:** End of Phase 1. 

## How to Continue
Proceed to Phase 2 by setting up a basic `index.html` and `app.js` file, requesting webcam/microphone permissions, and importing the MediaPipe CDN links.