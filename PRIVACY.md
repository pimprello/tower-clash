# Privacy policy: Tower Clash uploader

Last updated: 10 November 2026

Tower Clash uploader is a personal tool. It makes short simulation videos and uploads them to one YouTube channel, the channel of the repository owner.

- It does not collect personal data from viewers. It has no sign-up and no user accounts.
- To upload, it uses a Google OAuth refresh token that the owner stores as a GitHub Actions secret. The token is used only to upload videos to the owner's YouTube channel, set their thumbnails and read their view counts (permissions `youtube.upload`, `youtube` and `youtube.force-ssl`).
- It does not read, store or share anything else from the Google account.
- Upload records (title, video link and date) are saved in `uploads.md` in this repository. Run logs are visible to the repository owner in GitHub Actions.
- Use of information received from Google APIs follows the Google API Services User Data Policy, including its Limited Use requirements.
- For how Google handles data, see https://policies.google.com/privacy
- Questions: open an issue at https://github.com/pimprello/tower-clash/issues
