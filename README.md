# Firebase Feedback

This project allows multiple apps to send feedback to a single public endpoint without exposing
developer email addresses or maintaining a backend server.

## How it works

1. Apps send feedback via **GET parameters** to the static site
2. The site validates input in the browser
3. Feedback is written directly to **Firebase Realtime Database**
4. Data is protected using Firebase security rules

## Example Request

```text
https://datnguyencr.github.io/feedback-manager?appId=coin_app%20&category=bug&message=App%20crashes%20on%20launch%20&platform=android%20&version=1.0.0
```
