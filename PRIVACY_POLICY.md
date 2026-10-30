# Privacy Policy for Answer Imagifier: ChatGPT Long Screenshot & Answer to Image

Effective date: October 12, 2026

Answer Imagifier: ChatGPT Long Screenshot & Answer to Image (the "Extension") creates PNG or JPG images from ChatGPT answers. This policy explains how the Extension handles information.

## Information the Extension accesses

The Extension runs only on `chatgpt.com` and `chat.openai.com`. It accesses the content and layout of the ChatGPT page that is already open in your browser so it can add export controls and render the answer you choose. If you enable the option to include your prompt, it also accesses the prompt immediately preceding that answer.

The Extension may temporarily process text, code, tables, diagrams, formulas, SVG graphics, readable canvas content, and supported network photos in structured image cards. Generated images and citations are excluded. Supported sandbox visualizations and native maps may be captured as static images; unsupported embedded pages, audio, and video are replaced with notices.

## How information is used

All image generation happens locally in your browser. The selected content is used only to create the preview and exported image you request. The Extension does not use the content for analytics, advertising, profiling, or model training.

The Extension does not:

- collect or transmit your conversations to the developer;
- operate a remote server or analytics service;
- read cookies, passwords, authentication tokens, or payment information;
- access the ChatGPT or OpenAI API;
- create public sharing links; or
- sell or share personal information.

Page resources needed to reproduce visible content, such as eligible fonts or graphics, may be requested by your browser from their original source while the image is rendered. These resources are not sent to the developer. For supported photos, a background worker requests only the existing image URL from images.openai.com, without cookies, credentials, or a referrer. It does not send answer or prompt text. The downloaded bytes are held temporarily in memory for the requested export.

## Storage and retention

The Extension stores export preferences (theme, format, automatic or custom layout width, quality, preset or custom font size, diagram size, layout spacing, whether to auto-render on entry, whether to include the prompt, whether to show images, and whether to show extension credit) locally using chrome.storage.local. These preferences persist across browser restarts and are not synced through Chrome or transmitted to the developer. Uninstalling the Extension removes this stored data. Conversation content, custom file names, and generated images are not saved in extension storage. Generated image data remains in browser memory only while the export panel is open. It is released when the panel closes or the page unloads. An image leaves browser memory only when you choose to download it or copy it to the clipboard; the resulting file or clipboard item is then controlled by you and your device.

## Permissions

The Extension requests the storage permission solely to save and restore export preferences. Content scripts run on ChatGPT pages and approved visualization sandbox frames. Host access to `https://images.openai.com/*` allows the background worker to read supported photos despite page-level CORS restrictions. Requests are restricted to approved ChatGPT main-frame senders and static image resource paths; redirects, unsupported image types and oversized responses are rejected.

## Third-party services

Your use of ChatGPT remains subject to OpenAI's own terms and privacy policy. The Extension is an independent, unofficial tool and is not affiliated with or endorsed by OpenAI.

## Changes to this policy

This policy may be updated if the Extension's data-handling practices change. Material changes will be reflected in this file and identified by a revised effective date.

## Contact

For privacy questions or requests, open an issue at <https://github.com/KangweiLIAO/answer-imagifier/issues>.
