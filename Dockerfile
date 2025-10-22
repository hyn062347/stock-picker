FROM python:3.12.9

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY server/Try.py server/Try.py

CMD ["python", "server/Try.py"]