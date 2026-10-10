import socket
from urllib.parse import urlparse
import ipaddress

def is_safe_url(url: str) -> bool:
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return False
            
        hostname = parsed.hostname
        if not hostname:
            return False
            
        # Basic check for metadata/localhost by string
        if hostname in ("localhost", "169.254.169.254"):
            return False
            
        # Resolve IP to check for private/loopback
        # Note: in a high-concurrency async app, this blocking call should be offloaded,
        # but for a local single-user tool it is acceptable.
        ip_addr = socket.gethostbyname(hostname)
        ip = ipaddress.ip_address(ip_addr)
        
        if ip.is_loopback or ip.is_private or ip.is_link_local or ip.is_multicast:
            return False
            
        return True
    except Exception:
        return False
