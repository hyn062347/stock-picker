import requests, pandas as pd, certifi, bs4
from bs4 import BeautifulSoup
from io import StringIO
from urllib.parse import urlparse, parse_qs, urljoin

USER_AGENT = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}

def get_news_tables(code: str, page: int = 1):
    base = f"https://finance.naver.com/item/news.naver?code={code}"
    sess = requests.Session()
    sess.headers.update({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8",
    })

    # 1️⃣ 첫 페이지 요청 → 쿠키 획득
    r1 = sess.get(base, verify=certifi.where(), timeout=10)
    r1.raise_for_status()

    # 2️⃣ iframe src 추출
    soup = BeautifulSoup(r1.text, "html.parser")
    src = soup.select_one("#news_frame")["src"]
    if "?page=" not in src:          # 혹시 page 파라미터가 비어 있으면 채우기
        src += f"&page={page}"
    iframe_url = urljoin(base, src)

    # 3️⃣ 같은 세션 + Referer 로 두 번째 요청
    r2 = sess.get(
        iframe_url,
        headers={"Referer": base, **sess.headers},
        verify=certifi.where(),
        timeout=10,
    )
    r2.raise_for_status()

    soup = bs4.BeautifulSoup(r2.text, "html.parser")
    for tr in soup.select("tr.relation_lst"):
        tr.decompose()                       # DOM에서 완전히 삭제

    html_clean = str(soup)

    # print(html_clean)

    links = []
    for a in soup.find_all("a", href=True):
        href = a["href"]
        # 절대 URL일 때
        if href.startswith("https://n.news.naver.com/mnews/article"):
            full_url = href
        # 상대경로일 때
        elif href.startswith("/item/news_read.naver?article_id="):
            full_url = urljoin("https://finance.naver.com", href)
        else:
            continue
        links.append(full_url)

    # print(links)

    articles = []
    for url in links:
        try:
            art = fetch_article(url)
            articles.append(art)
        except Exception as e:
            print(f"[WARN] {url} 크롤링 중 에러: {e}")
    return articles


def fetch_article(url: str) -> dict:
    """
    finance.naver.com/item/news_read.naver?article_id=... → 
      https://n.news.naver.com/mnews/article/{office_id}/{article_id}
    로 바꿔서 크롤링
    """
    parsed = urlparse(url)

    # 1) finance.naver.com/news_read.naver → n.news.naver.com URL로 변환
    if parsed.netloc.endswith("finance.naver.com") and "news_read.naver" in parsed.path:
        qs = parse_qs(parsed.query)
        aid = qs.get("article_id", [""])[0]
        oid = qs.get("office_id", [""])[0]
        if aid and oid:
            url = f"https://n.news.naver.com/mnews/article/{oid}/{aid}"

    # 2) 실제 기사 페이지 요청
    resp = requests.get(
        url,
        headers=USER_AGENT,
        verify=certifi.where(),
        timeout=10
    )
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")

    # 3) 제목/본문 추출 (n.news.naver.com 공통 파서)
    title_tag = soup.select_one("h2#title_area span")
    title = title_tag.get_text(strip=True) if title_tag else ""

    article_tag = soup.select_one("article#dic_area")
    if not article_tag:
        return {"url": url, "title": "", "content": ""}

    # ① 모든 <br> 을 줄바꿈 문자열로 대체
    for br in article_tag.find_all("br"):
        br.replace_with("\n")

    # ② get_text() 에서 separator 로도 한 번 더 보정
    content = article_tag.get_text(separator="\n", strip=True)

    return {"url": url, "title": title, "content": content}