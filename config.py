from pydantic import BaseModel


class ApiPrefix(BaseModel):
    prefix: str = "/api"
v1: ApiPrefix = ApiPrefix()
