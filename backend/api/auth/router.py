from fastapi import APIRouter, Depends, HTTPException, status

from .dependencies import get_current_user, require_admin
from .models import ChangePasswordRequest, LoginRequest, RegisterRequest, TokenResponse, WhitelistAddRequest
from .service import (
    add_approved_emails,
    create_token,
    create_user,
    get_user,
    hash_password,
    is_email_approved,
    list_approved_emails,
    list_users,
    remove_approved_email,
    update_password,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest):
    user = get_user(body.email)
    if not user or not verify_password(body.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    token = create_token(user["email"], user["role"])
    return {"access_token": token, "token_type": "bearer", "email": user["email"], "role": user["role"]}


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest):
    email = body.email
    if not is_email_approved(email):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This email is not in the approved list. Contact your instructor.",
        )
    if get_user(email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )
    create_user(email, hash_password(body.password), role="student")
    token = create_token(email, "student")
    return {"access_token": token, "token_type": "bearer", "email": email, "role": "student"}


@router.get("/me")
def me(user: dict = Depends(get_current_user)):
    return user


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(body: ChangePasswordRequest, user: dict = Depends(get_current_user)):
    db_user = get_user(user["email"])
    if not db_user or not verify_password(body.current_password, db_user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect.",
        )
    update_password(user["email"], hash_password(body.new_password))


# ── Admin endpoints ───────────────────────────────────────────────────────────

@router.get("/admin/whitelist")
def get_whitelist(_: dict = Depends(require_admin)):
    return list_approved_emails()


@router.post("/admin/whitelist", status_code=status.HTTP_201_CREATED)
def add_whitelist(body: WhitelistAddRequest, _: dict = Depends(require_admin)):
    add_approved_emails(body.emails)
    return {"added": len(body.emails)}


@router.delete("/admin/whitelist/{email}")
def delete_whitelist_entry(email: str, _: dict = Depends(require_admin)):
    remove_approved_email(email)
    return {"removed": True}


@router.get("/admin/users")
def get_users(_: dict = Depends(require_admin)):
    return list_users()
