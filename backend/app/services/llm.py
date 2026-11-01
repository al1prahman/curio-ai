import httpx

from app.core.config import settings


class LLMService:
    """Provider-agnostic LLM service.

    Supports: gemini (free tier), openai, groq, openrouter, custom
    """

    def __init__(self) -> None:
        self._provider = settings.LLM_PROVIDER
        self._model = settings.LLM_MODEL
        self._api_key = settings.LLM_API_KEY
        self._base_url = settings.LLM_BASE_URL

    def generate(self, system_prompt: str, user_message: str) -> dict:
        """Generate a response. Returns {content, input_tokens, output_tokens}."""
        if self._provider == "mock":
            return self._generate_mock(system_prompt, user_message)
        if self._provider == "gemini":
            return self._generate_gemini(system_prompt, user_message)
        return self._generate_openai_compatible(system_prompt, user_message)

    def _generate_mock(self, system_prompt: str, user_message: str) -> dict:
        """Mock provider for development/testing without API keys."""
        # Extract source count from the prompt
        source_count = user_message.count("[Source ")
        if source_count > 0:
            content = (
                f"Based on {source_count} retrieved document(s), here is a summary "
                f"of the relevant information found in the knowledge base. "
                f"[Mock response - configure LLM_PROVIDER and LLM_API_KEY for real AI responses]"
            )
        else:
            content = (
                "I don't have enough information in the knowledge base to answer "
                "this question. Please upload relevant documents first. "
                "[Mock response - configure LLM_PROVIDER and LLM_API_KEY for real AI responses]"
            )
        return {
            "content": content,
            "input_tokens": len(user_message) // 4,
            "output_tokens": len(content) // 4,
        }

    def _generate_gemini(self, system_prompt: str, user_message: str) -> dict:
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{self._model}:generateContent?key={self._api_key}"
        )
        payload = {
            "system_instruction": {"parts": [{"text": system_prompt}]},
            "contents": [{"role": "user", "parts": [{"text": user_message}]}],
            "generationConfig": {"temperature": 0.3, "maxOutputTokens": 2048},
        }

        with httpx.Client(timeout=120) as client:
            response = client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()

        content = data["candidates"][0]["content"]["parts"][0]["text"]
        usage = data.get("usageMetadata", {})
        return {
            "content": content,
            "input_tokens": usage.get("promptTokenCount", 0),
            "output_tokens": usage.get("candidatesTokenCount", 0),
        }

    def _generate_openai_compatible(self, system_prompt: str, user_message: str) -> dict:
        base = self._base_url or self._default_base_url()
        url = f"{base}/chat/completions"
        headers = {"Authorization": f"Bearer {self._api_key}"}
        payload = {
            "model": self._model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            "temperature": 0.3,
            "max_tokens": 2048,
        }

        with httpx.Client(timeout=120) as client:
            response = client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()

        choice = data["choices"][0]["message"]["content"]
        usage = data.get("usage", {})
        return {
            "content": choice,
            "input_tokens": usage.get("prompt_tokens", 0),
            "output_tokens": usage.get("completion_tokens", 0),
        }

    def _default_base_url(self) -> str:
        defaults = {
            "openai": "https://api.openai.com/v1",
            "groq": "https://api.groq.com/openai/v1",
            "openrouter": "https://openrouter.ai/api/v1",
        }
        return defaults.get(self._provider, "https://api.openai.com/v1")
