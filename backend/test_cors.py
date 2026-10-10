from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.testclient import TestClient

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_origin_regex=r"^moz-extension://.*",
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/test")
def test():
    return {"status": "ok"}

client = TestClient(app)
res = client.options("/test", headers={"Origin": "moz-extension://1234-5678", "Access-Control-Request-Method": "POST"})
print("STATUS:", res.status_code)
print("HEADERS:", res.headers)
