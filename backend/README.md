For database acess
1. Create an .env and put the DATABASE_URL sent in the group chat
2. Instal deps
pip install -r requirements.txt
3. run migrations
alembic upgrade head
4. in alembic.ini place the databse url in this line 


sqlalchemy.url = put the url that i sent in the groupchat here 

