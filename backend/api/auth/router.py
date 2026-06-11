from fastapi import APIRouter, Depends, HTTPException, status

from .dependencies import get_current_user, require_admin
from .models import ChangePasswordRequest, LoginRequest, RegisterRequest, TokenResponse, WhitelistAddRequest
from .service import (
    add_approved_emails,
    create_token,
    create_user,
    delete_user,
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
    user = get_user(body.username)
    if not user or not verify_password(body.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    token = create_token(user["username"], user["role"])
    return {"access_token": token, "token_type": "bearer", "email": user["username"], "role": user["role"]}


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest):
    if not is_email_approved(body.email):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This email is not in the approved list. Contact your instructor.",
        )
    if get_user(body.username):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this username already exists.",
        )
    create_user(body.username, hash_password(body.password), role="student", email=body.email)
    token = create_token(body.username, "student")
    return {"access_token": token, "token_type": "bearer", "email": body.username, "role": "student"}


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


@router.delete("/admin/users/{username}")
def delete_user_account(username: str, keep_whitelisted: bool = False, admin: dict = Depends(require_admin)):
    if username.lower() == admin["email"].lower():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete your own account.")
    target = get_user(username)
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    delete_user(username)
    email_removed = False
    if not keep_whitelisted and target["email"]:
        remove_approved_email(target["email"])
        email_removed = True
    return {"deleted": username, "email_removed_from_whitelist": email_removed}
