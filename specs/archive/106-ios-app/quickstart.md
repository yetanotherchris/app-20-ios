# iOS Manual Testing Guide

Use this guide for manual local testing through Expo Go on an iPhone connected to `npm run dev:ios`. Automated native testing, EAS builds, Apple Developer Program enrollment, App Store preparation, distribution, and readiness criteria are deferred until a later spec explicitly includes them.

## Prerequisites

1. Specs 107 and 108 are merged to `main`.
2. An Expo-compatible Node environment is available.
3. An iPhone with Expo Go installed is available.
4. Test provider and S3 credential files contain non-production values.

## Manual Local Checks

Start the local server with `npm run dev:ios`, open the project in Expo Go on the iPhone, and exercise the flows below. Record usability issues for follow-on implementation work. Do not treat this guide as an App Store readiness gate.

## Manual iPhone Checklist

1. Open the project in Expo Go and confirm all shell content respects notch and home-indicator safe areas.
2. With no provider key, type a prompt and send. Confirm the document picker opens, cancellation retains the draft, and successful import automatically sends it.
3. Confirm software keyboard, hardware keyboard, and an IME do not send during composition. Confirm touch Return inserts a newline.
4. Confirm composer growth reaches internal scrolling on a small screen and messages remain selectable.
5. Set the largest Dynamic Type size and confirm chat content and controls are readable without clipping.
6. During streaming, scroll away and back, then stop. Confirm the retained partial response matches desktop behavior.
7. Background the app while streaming and while an idle-draft timer is pending. Reopen and confirm the partial response and draft persist.
8. Import S3 credentials, create a conversation, allow sync, then verify the matching JSON objects and manifest exist in the configured bucket.
9. Open the `...` menu and select Clear conversations. Cancel the confirmation once and confirm the current conversation remains. Confirm it on the second attempt, then verify local history and S3 conversation objects are empty and a blank chat is shown.
