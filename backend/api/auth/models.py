from pydantic import BaseModel, field_validator


class LoginRequest(BaseModel):
    username: str
    password: str

    @field_validator("username")
    @classmethod
    def normalise(cls, v: str) -> str:
        return v.lower().strip()


class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str

    @field_validator("username")
    @classmethod
    def normalise_username(cls, v: str) -> str:
        return v.lower().strip()

    @field_validator("email")
    @classmethod
    def normalise_email(cls, v: str) -> str:
        return v.lower().strip()

    @field_validator("password")
    @classmethod
    def min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    email: str
    role: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class WhitelistAddRequest(BaseModel):
    emails: list[str]

    @field_validator("emails")
    @classmethod
    def normalise(cls, v: list[str]) -> list[str]:
        return [e.lower().strip() for e in v if e.strip()]
