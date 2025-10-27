# HuggingFace API Setup for AI Visualizer

## Getting Your Free API Token

1. **Create a HuggingFace Account** (if you don't have one):
   - Go to https://huggingface.co/join
   - Sign up for free

2. **Generate API Token**:
   - Go to https://huggingface.co/settings/tokens
   - Click "New token"
   - Give it a name (e.g., "IFC Viewer AI")
   - Select "Read" access (sufficient for inference)
   - Click "Generate"
   - Copy the token (starts with `hf_...`)

3. **Add Token to Your Project**:
   - Create a `.env` file in the project root (if it doesn't exist)
   - Add this line:
     ```
     HF_TOKEN=hf_your_token_here
     ```
   - Replace `hf_your_token_here` with your actual token

## Free Models for Photorealistic Rendering

The AI Visualizer is configured to use **FREE** HuggingFace models:

### Current Model: Stable Diffusion XL Turbo
- **Model**: `stabilityai/sdxl-turbo`
- **Type**: Image-to-image
- **Cost**: FREE (rate limited)
- **Speed**: Fast (2-4 seconds)
- **Best for**: Quick architectural renders

### Alternative Free Models:

1. **Stable Diffusion XL** (slower but higher quality)
   - Model: `stabilityai/stable-diffusion-xl-refiner-1.0`

2. **Realistic Vision** (great for architecture)
   - Model: `SG161222/Realistic_Vision_V6.0_B1_noVAE`

## Rate Limits

- Free tier: ~1000 requests/month
- If you hit limits, wait a few minutes or upgrade to Pro ($9/month for unlimited)

## Important Notes

- Never commit your `.env` file to git (it's already in `.gitignore`)
- Keep your token secret
- The token only needs "Read" permissions
