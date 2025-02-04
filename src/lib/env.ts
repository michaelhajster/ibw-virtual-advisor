// Edge-compatible environment configuration
const env = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  HEYGEN_API_KEY: process.env.HEYGEN_API_KEY,
};

// Debug log environment state
console.log('🔧 [Env] Loading environment variables:', {
  hasOpenAI: !!env.OPENAI_API_KEY,
  hasHeyGen: !!env.HEYGEN_API_KEY,
  heygenPrefix: env.HEYGEN_API_KEY?.slice(0, 10)
});

// Validate environment variables
Object.entries(env).forEach(([key, value]) => {
  if (!value) {
    console.error(`❌ [Env] Missing required environment variable: ${key}`);
  }
});

export default env; 