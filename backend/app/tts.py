from abc import ABC, abstractmethod
import os
import edge_tts
import shutil

class TTSProvider(ABC):
    @abstractmethod
    async def generate_audio(self, text: str, output_path: str) -> bool:
        pass

class EdgeTTSProvider(TTSProvider):
    """
    Online TTS provider using edge-tts. 
    Note: Requires internet access. Do not use if strict offline is required.
    """
    def __init__(self, voice="en-US-AriaNeural"):
        self.voice = voice

    async def generate_audio(self, text: str, output_path: str) -> bool:
        try:
            # Basic chunking could be added here if needed, but edge-tts handles standard article sizes well
            communicate = edge_tts.Communicate(text, self.voice)
            await communicate.save(output_path)
            return True
        except Exception as e:
            print(f"EdgeTTSProvider Error: {e}")
            return False

class FallbackTTSProvider(TTSProvider):
    """
    Offline fallback provider that copies the existing test-tone fixture.
    """
    async def generate_audio(self, text: str, output_path: str) -> bool:
        try:
            stub_path = os.path.join(os.path.dirname(__file__), "stub_audio.wav")
            if os.path.exists(stub_path):
                shutil.copy(stub_path, output_path)
                return True
            return False
        except Exception as e:
            print(f"FallbackTTSProvider Error: {e}")
            return False

async def generate_episode_audio(text: str, output_path: str) -> bool:
    """
    Tries the primary TTS provider, falls back to test fixture on failure.
    """
    provider = EdgeTTSProvider()
    success = await provider.generate_audio(text, output_path)
    if not success:
        print("Falling back to test fixture audio.")
        fallback = FallbackTTSProvider()
        success = await fallback.generate_audio(text, output_path)
    return success
