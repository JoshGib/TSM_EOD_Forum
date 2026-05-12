from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db import get_db
from models import Thread, User, Comment
from schemas import ThreadCreate, ThreadOut
from auth import get_current_user


router = APIRouter(prefix="/threads", tags=["threads"])


#cretae a thread
@router.post("/", response_model=ThreadOut)
def create_thread(thread: ThreadCreate, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    new_thread = Thread(
        title=thread.title,
        category=thread.category,
        content=thread.content,
        user_id=user_id
    )
    db.add(new_thread)
    db.commit()
    db.refresh(new_thread)
    return {
        **new_thread.__dict__,
        "author_username": db_user.username,
        "replies_count": 0
    }

#get all threads
@router.get("/", response_model=list[ThreadOut])
def get_threads(db: Session = Depends(get_db)):
    threads = db.query(Thread).all()
    results = []
    for thread in threads:
        user = db.query(User).filter(User.id == thread.user_id).first()
        replies_count = db.query(Comment).filter(Comment.thread_id == thread.id).count()
      
        results.append({
            "id": thread.id,
            "title": thread.title,
            "category": thread.category,
            "content": thread.content,
            "views": thread.views,
            "likes_count": thread.likes_count,
            "created_at": thread.created_at,
            "author_username": user.username if user else "Unknown",
            "replies_count": replies_count
        })
    return results

#get a single thread
@router.get("/{thread_id}", response_model=ThreadOut)
def get_thread(thread_id: int, db: Session = Depends(get_db)):
    thread = db.query(Thread).filter(Thread.id == thread_id).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    #increment thread views
    thread.views += 1
    db.commit()
    db.refresh(thread)

    user = db.query(User).filter(User.id == thread.user_id).first()
    replies_count = db.query(Comment).filter(Comment.thread_id == thread.id).count()
    return {
        **thread.__dict__,
        "author_username": user.username if user else "Unknown",
        "replies_count": replies_count
    }

#delete a thread
@router.delete("/{thread_id}")
def delete_thread(thread_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("user_id")
    user_role = current_user.get("role")

    thread = db.query(Thread).filter(Thread.id == thread_id).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    #make sure only the owner and admin can delete the thread
    if thread.user_id != user_id and user_role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to delete this thread")
    db.delete(thread)
    db.commit()
    return {"detail": "Thread deleted successfully"}

@router.get("/threads/{thread_id}/comments")
def get_thread_comments(thread_id: int, db: Session = Depends(get_db)):
    thread = db.query(Thread).filter(Thread.id == thread_id).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    comments = db.query(Comment).filter(Comment.thread_id == thread_id).all()
    return comments