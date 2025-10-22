import requests, pandas as pd, certifi
from bs4 import BeautifulSoup

def get_FF_tables(code: str, page: int = 1):
    base = f"https://finance.naver.com/item/frgn.naver?code={code}"
    sess = requests.Session()
    sess.headers.update({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8",
    })

    # 1️⃣ 첫 페이지 요청 → 쿠키 획득
    r1 = sess.get(base, verify=certifi.where(), timeout=10)
    r1.raise_for_status()

    soup = BeautifulSoup(r1.text, "html.parser")
    target_table = soup.find("table", summary=lambda s: s and "외국인 기관 순매매 거래량" in s)

    rows = target_table.find_all("tr")
    # print(rows)
    data = []
    for row in rows:
        cols = row.find_all("td")
        if len(cols) == 9:
            data.append([col.text.strip().replace(",", "").replace("+", "").replace("\n", "").replace("\t", "") for col in cols])

    columns = ["날짜", "종가", "전일비", "등락률", "거래량", "기관순매매", "외인순매매", "외인보유주", "외인보유율"]
    
    df = pd.DataFrame(data, columns=columns)
    df["전일비"] = df["전일비"].apply(lambda x: "+" + x[2:] if "상승" in x else ("-" + x[2:] if "하락" in x else x))
    
    return df
