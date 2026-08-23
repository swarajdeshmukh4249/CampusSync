"""
CampusSync - Notifier
----------------------
Sends notifications via:
  • Firebase FCM  → Push notifications on phone
  • Twilio        → WhatsApp messages

Both have free tiers sufficient for college-scale usage.

Setup required (add to .env file):
  FIREBASE_CREDENTIALS_PATH = path/to/firebase-key.json
  TWILIO_ACCOUNT_SID        = ACxxxxxxxxxxxxxxxx
  TWILIO_AUTH_TOKEN         = your_auth_token
  TWILIO_WHATSAPP_NUMBER    = whatsapp:+14155238886
"""

import os
import httpx
import json
from dotenv import load_dotenv

load_dotenv()


class Notifier:

    def __init__(self):
        # Twilio credentials from environment variables
        self.twilio_sid    = os.getenv("TWILIO_ACCOUNT_SID", "")
        self.twilio_token  = os.getenv("TWILIO_AUTH_TOKEN", "")
        self.twilio_from   = os.getenv("TWILIO_WHATSAPP_NUMBER", "whatsapp:+14155238886")

        # Firebase credentials path
        self.firebase_creds = os.getenv("FIREBASE_CREDENTIALS_PATH", "firebase-key.json")
        self._fcm_token     = None  # Cached OAuth token for FCM


    # ── PUSH NOTIFICATION (Firebase FCM) ──────────────────────────────────────
    async def send_push(self, fcm_token: str, title: str, body: str, data: dict = None):
        """
        Send a push notification to the student's phone.
        
        fcm_token: The device token from Flutter app (firebase_messaging package)
        title:     Notification title
        body:      Notification body text
        data:      Extra data (optional, for deep linking in Flutter)
        """
        if not fcm_token:
            print("[FCM] No FCM token, skipping push notification")
            return

        try:
            # Get FCM access token
            access_token = await self._get_fcm_access_token()

            # Read project ID from credentials file
            with open(self.firebase_creds) as f:
                creds = json.load(f)
            project_id = creds.get("project_id", "")

            url = f"https://fcm.googleapis.com/v1/projects/{project_id}/messages:send"

            payload = {
                "message": {
                    "token": fcm_token,
                    "notification": {
                        "title": title,
                        "body":  body,
                    },
                    "data": {k: str(v) for k, v in (data or {}).items()},
                    "android": {
                        "priority": "high",
                        "notification": {
                            "sound":       "default",
                            "click_action": "FLUTTER_NOTIFICATION_CLICK",
                        }
                    },
                    "apns": {  # iOS
                        "payload": {
                            "aps": {
                                "sound": "default",
                                "badge": 1,
                            }
                        }
                    }
                }
            }

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url,
                    json=payload,
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Content-Type":  "application/json",
                    },
                    timeout=10.0
                )

            if response.status_code == 200:
                print(f"[FCM] ✅ Push sent: {title}")
            else:
                print(f"[FCM] ❌ Failed: {response.status_code} — {response.text}")

        except FileNotFoundError:
            print("[FCM] firebase-key.json not found. Skipping push notification.")
            print("[FCM] Add your Firebase credentials file to get push notifications working.")
        except Exception as e:
            print(f"[FCM] Error: {e}")


    async def _get_fcm_access_token(self) -> str:
        """
        Gets a short-lived OAuth2 token to authenticate FCM API calls.
        Uses the Firebase service account JSON key.
        """
        # google-auth library handles this
        from google.oauth2 import service_account
        from google.auth.transport.requests import Request as GoogleRequest
        import google.auth

        credentials = service_account.Credentials.from_service_account_file(
            self.firebase_creds,
            scopes=["https://www.googleapis.com/auth/firebase.messaging"]
        )
        credentials.refresh(GoogleRequest())
        return credentials.token


    # ── WHATSAPP MESSAGE (Twilio) ──────────────────────────────────────────────
    async def send_whatsapp(self, to: str, message: str):
        """
        Send a WhatsApp message via Twilio.
        
        to:      Phone number with country code, e.g. "919876543210"
        message: The message text (supports *bold* and _italic_ in WhatsApp)
        
        Free Twilio sandbox:
          • Go to twilio.com → Messaging → Try WhatsApp
          • User must send a join code once to opt in
          • 100% free for development and testing
        """
        if not self.twilio_sid or not self.twilio_token:
            print("[WHATSAPP] Twilio credentials not set. Skipping WhatsApp message.")
            print("[WHATSAPP] Add TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN to .env")
            return

        if not to:
            print("[WHATSAPP] No WhatsApp number provided, skipping")
            return

        try:
            # Format the number
            to_number = f"whatsapp:+{to.lstrip('+')}"

            url = f"https://api.twilio.com/2010-04-01/Accounts/{self.twilio_sid}/Messages.json"

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url,
                    data={
                        "From": self.twilio_from,
                        "To":   to_number,
                        "Body": message,
                    },
                    auth=(self.twilio_sid, self.twilio_token),
                    timeout=10.0
                )

            if response.status_code in (200, 201):
                print(f"[WHATSAPP] ✅ Message sent to {to_number}")
            else:
                print(f"[WHATSAPP] ❌ Failed: {response.status_code} — {response.text}")

        except Exception as e:
            print(f"[WHATSAPP] Error: {e}")