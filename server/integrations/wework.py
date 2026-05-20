import httpx

from ..core.config import get_settings
from ..core.logging import get_logger

settings = get_settings()
logger = get_logger(__name__)


class WeWorkService:
    def __init__(self):
        self.corp_id = getattr(settings, 'WEWORK_CORP_ID', '')
        self.agent_id = getattr(settings, 'WEWORK_AGENT_ID', '')
        self.secret = getattr(settings, 'WEWORK_SECRET', '')
        self.token_url = "https://qyapi.weixin.qq.com/cgi-bin/gettoken"
        self.message_url = "https://qyapi.weixin.qq.com/cgi-bin/message/send"
        self._access_token: str | None = None

    async def get_access_token(self) -> str | None:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    self.token_url,
                    params={
                        "corpid": self.corp_id,
                        "corpsecret": self.secret
                    }
                )
                data = resp.json()
                if data.get("errcode") == 0:
                    self._access_token = data.get("access_token")
                    return self._access_token
                logger.error("wework_token_error", errcode=data.get("errcode"), errmsg=data.get("errmsg"))
                return None
        except Exception as e:
            logger.error("wework_token_exception", error=str(e))
            return None

    async def send_text_message(self, to_user: str, content: str) -> bool:
        if not self._access_token:
            await self.get_access_token()

        if not self._access_token:
            return False

        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    f"{self.message_url}?access_token={self._access_token}",
                    json={
                        "touser": to_user,
                        "msgtype": "text",
                        "agentid": self.agent_id,
                        "text": {"content": content}
                    }
                )
                data = resp.json()
                if data.get("errcode") == 0:
                    logger.info("wework_message_sent", to_user=to_user)
                    return True
                logger.error("wework_send_error", errcode=data.get("errcode"), errmsg=data.get("errmsg"))
                return False
        except Exception as e:
            logger.error("wework_send_exception", error=str(e))
            return False

    async def send_markdown_message(self, to_user: str, content: str) -> bool:
        if not self._access_token:
            await self.get_access_token()

        if not self._access_token:
            return False

        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    f"{self.message_url}?access_token={self._access_token}",
                    json={
                        "touser": to_user,
                        "msgtype": "markdown",
                        "agentid": self.agent_id,
                        "markdown": {"content": content}
                    }
                )
                data = resp.json()
                if data.get("errcode") == 0:
                    return True
                logger.error("wework_markdown_error", errcode=data.get("errcode"), errmsg=data.get("errmsg"))
                return False
        except Exception as e:
            logger.error("wework_markdown_exception", error=str(e))
            return False


wework_service = WeWorkService()
