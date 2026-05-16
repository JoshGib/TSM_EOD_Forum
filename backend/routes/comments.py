from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from db import get_db
from models import Comment, User, Thread
from schemas import CommentCreate, CommentOut
from auth import get_current_user
from datetime import datetime

router = APIRouter(prefix="/comments", tags=["comments"])

# create a comment
@router.post("/", response_model=CommentOut)
def create_comment(comment: CommentCreate, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    db_thread = db.query(Thread).filter(Thread.id == comment.thread_id).first()
    if not db_thread:
        raise HTTPException(status_code=404, detail="Thread not found")

    if comment.parent_comment_id:
        db_parent_comment = db.query(Comment).filter(Comment.id == comment.parent_comment_id).first()
        if not db_parent_comment:
            raise HTTPException(status_code=404, detail="Parent comment not found")
    new_comment = Comment(
        content=comment.content,
        thread_id=comment.thread_id,
        parent_comment_id=comment.parent_comment_id,
        user_id=user_id
    )
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)
    return {
        "id": new_comment.id,
        "content": new_comment.content,
        "thread_id": new_comment.thread_id,
        "parent_comment_id": new_comment.parent_comment_id,
        "created_at": new_comment.created_at,
        "user_id": new_comment.user_id,
        "username": db_user.username,
        "replies": []
    }

#get comments for a thread
@router.get("/thread/{thread_id}", response_model=list[CommentOut])
def get_comments_for_thread(thread_id: int, db: Session = Depends(get_db)):
    thread = db.query(Thread).filter(Thread.id == thread_id).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    comments = db.query(Comment).options(joinedload(Comment.user)).filter(Comment.thread_id == thread_id).order_by(Comment.created_at.desc()).all()
    result = []
    for comment in comments:
        result.append({
            "id": comment.id,
            "content": comment.content,
            "thread_id": comment.thread_id,
            "parent_comment_id": comment.parent_comment_id,
            "created_at": comment.created_at or datetime.utcnow(),
            "user_id": comment.user_id,
            "username": comment.user.username if comment.user else "Unknown",
            "replies": []
        })
    return result

#get replies for a comment
@router.get("/comment/{comment_id}/replies", response_model=list[CommentOut])
def get_replies_for_comment(comment_id: int, db: Session = Depends(get_db)):
    parent_comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not parent_comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    replies = db.query(Comment).options(joinedload(Comment.user)).filter(Comment.parent_comment_id == comment_id).all()
    return [{
        "id": reply.id,
        "content": reply.content,
        "thread_id": reply.thread_id,
        "parent_comment_id": reply.parent_comment_id,
        "created_at": reply.created_at or datetime.utcnow(),
        "user_id": reply.user_id,
        "username": reply.user.username if reply.user else "Unknown",
        "replies": []
    } for reply in replies]

#delete a comment
@router.delete("/{comment_id}")
def delete_comment(comment_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("user_id")
    user_role = current_user.get("role")

    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    if comment.user_id != user_id and user_role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to delete this comment")
    comment.is_deleted = True
    comment.content = "[deleted]"
    db.commit()
    db.refresh(comment)

    return {"detail": "Comment deleted successfully"}


@router.post("/{comment_id}/like")
def like_comment(comment_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    comment.likes_count = (comment.likes_count or 0) + 1
    db.commit()
    db.refresh(comment)
    return {"detail": "Comment liked", "likes_count": comment.likes_count}


@router.post("/{comment_id}/unlike")
def unlike_comment(comment_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    comment.likes_count = max(0, (comment.likes_count or 0) - 1)
    db.commit()
    db.refresh(comment)
    return {"detail": "Comment unliked", "likes_count": comment.likes_count}
