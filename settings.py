
from pydantic_settings import BaseSettings, SettingsConfigDict
import os
print(os.getenv("MONGO_URL"))


class Settings(BaseSettings):
    MYSQL_HOST: str
    MYSQL_USER: str
    MYSQL_PASSWORD: str
    MYSQL_DB: str

    MONGO_URL: str
    MONGO_DB: str
    MONGO_LOG_COLLECTION: str
    MONGO_LOG_STATS: str = "stats"

    TMDB_API_KEY: str
    # MONGODB_URL_EDIT: str
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"),
        env_file_encoding="utf-8",
    )


settings = Settings()#type:ignore