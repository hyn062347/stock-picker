from crewai.tools import tool
from crewai_tools import ScrapeWebsiteTool
from crewai import Task, Crew, Agent
from dotenv import load_dotenv
import yfinance as yf
import pandas_ta as ta
import os, sys, json, time, random, mysql.connector


# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------


#환경변수 저장
load_dotenv()
os.environ["OPENAI_API_KEY"] = os.getenv("OPENAI_API_KEY")
os.environ["OPENAI_MODEL_NAME"] = os.getenv("OPENAI_MODEL_NAME")

DB_CONFIG = {
    "host": os.getenv("DB_HOST"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "database": os.getenv("DB_NAME")
}

#실행시 심볼 초기화
if len(sys.argv) > 1:
    symbol = sys.argv[1]
else:
    print("No Symbol")
    sys.exit(1)

#DB 연결
def connect_db():
    return mysql.connector.connect(**DB_CONFIG)

# DB 저장 함수
def save_rmd(report):

    if isinstance(report, str):
        try:
            data = json.loads(report)
        except json.JSONDecodeError as e:
            print("[ERR] JSON 파싱 실패:", e)
            return
    else:
        data = report

    conn = connect_db()
    cursor = conn.cursor()

    query = """
        INSERT INTO stock_recommendation
        (symbol, recommendation, score, report)
        VALUES (%s, %s, %s, %s)
    """
    cursor.execute(
        query,
        (
            data["symbol"],
            data["recommendation"],
            data.get("score", 0),
            data.get("report"),
        ),
    )
    conn.commit()
    cursor.close()
    conn.close()
    print(f" {symbol} Data Saved.")


# 공용 함수
def get_price_df(ticker: str, period: str = "3mo", interval: str = "1d"):
    """
    Return historical OHLCV DataFrame for the given ticker using yfinance.

    Args:
        ticker (str): Stock symbol, e.g., "AAPL", "066970.KS".
        period (str): Period string accepted by yfinance. Defaults to "3mo".
        interval (str): Bar interval. Defaults to "1d".

    Returns:
        pandas.DataFrame: Historical price data indexed by date.
    """
    return yf.Ticker(ticker).history(period=period, interval=interval)

#Tools
@tool("Stock News")
def stock_news(ticker: str, retries: int = 3, pause: float = 2.0):
    """
    Useful to get news about a stock.
    The input should be a ticker, for example AAPL, TSLA.
    """
    for attempt in range(retries):
        try:
            return yf.Ticker(ticker).news
        except Exception as e:
            msg = str(e)
            # yfinance 0.2/0.3 는 HTTP 오류를 그대로 문자열에 포함
            if "Too Many Requests" in msg and attempt < retries - 1:
                # 지수 back-off + 무작위 지터로 분산
                sleep_for = pause * (2 ** attempt) + random.uniform(0, 1)
                time.sleep(sleep_for)
                continue
            raise   # 다른 에러 또는 마지막 시도는 그대로 전파
    return yf.Ticker(ticker).news

scrape_tool = ScrapeWebsiteTool()

@tool("Stock Price")
def stock_price(ticker : str, retries: int = 3, pause: float = 2.0):
    """
    Useful to get stock price data of 3 months.
    The input should be a ticker, for example AAPL, TSLA.
    """
    for attempt in range(retries):
        try:
            return get_price_df(ticker)
        except Exception as e:
            msg = str(e)
            # yfinance 0.2/0.3 는 HTTP 오류를 그대로 문자열에 포함
            if "Too Many Requests" in msg and attempt < retries - 1:
                # 지수 back-off + 무작위 지터로 분산
                sleep_for = pause * (2 ** attempt) + random.uniform(0, 1)
                time.sleep(sleep_for)
                continue
            raise   # 다른 에러 또는 마지막 시도는 그대로 전파
    return get_price_df(ticker)


@tool("RSI")
def rsi(ticker: str, length: int = 14, retries: int = 3, pause: float = 2.0):
    """
    Useful to get RSI.
    The input should be a ticker, for example AAPL, TSLA.
    """
    for attempt in range(retries):
        df = get_price_df(ticker)
        df["RSI"] = ta.rsi(df["Close"], length=length)
        try:
            return df[["RSI"]].dropna()
        except Exception as e:
            msg = str(e)
            # yfinance 0.2/0.3 는 HTTP 오류를 그대로 문자열에 포함
            if "Too Many Requests" in msg and attempt < retries - 1:
                # 지수 back-off + 무작위 지터로 분산
                sleep_for = pause * (2 ** attempt) + random.uniform(0, 1)
                time.sleep(sleep_for)
                continue
            raise   # 다른 에러 또는 마지막 시도는 그대로 전파
    return df[["RSI"]].dropna()


@tool("MACD")
def macd(ticker: str, retries: int = 3, pause: float = 2.0):
    """
    Useful to get MACD about a stock.
    The input should be a ticker, for example AAPL, TSLA.
    """
    df = get_price_df(ticker)
    macd_df = ta.macd(df["Close"], fast=12, slow=26, signal=9)
    for attempt in range(retries):
        try:
            return macd_df.dropna()
        except Exception as e:
            msg = str(e)
            # yfinance 0.2/0.3 는 HTTP 오류를 그대로 문자열에 포함
            if "Too Many Requests" in msg and attempt < retries - 1:
                # 지수 back-off + 무작위 지터로 분산
                sleep_for = pause * (2 ** attempt) + random.uniform(0, 1)
                time.sleep(sleep_for)
                continue
            raise   # 다른 에러 또는 마지막 시도는 그대로 전파
    return macd_df.dropna()

@tool("Bollinger")
def bollinger(ticker: str, retries: int = 3, pause: float = 2.0):
    """
    Useful to get Bollinger data about a stock.
    The input should be a ticker, for example AAPL, TSLA.
    """
    df = get_price_df(ticker)
    bb_df = ta.bbands(df["Close"])
    for attempt in range(retries):
        try:
            return bb_df.dropna()
        except Exception as e:
            msg = str(e)
            # yfinance 0.2/0.3 는 HTTP 오류를 그대로 문자열에 포함
            if "Too Many Requests" in msg and attempt < retries - 1:
                # 지수 back-off + 무작위 지터로 분산
                sleep_for = pause * (2 ** attempt) + random.uniform(0, 1)
                time.sleep(sleep_for)
                continue
            raise   # 다른 에러 또는 마지막 시도는 그대로 전파
    return bb_df.dropna()

# @tool("Stock Price 1Year")
# def stock_price_1Year(ticker: str):
#     """
#     Useful to get stock price data of 1 Year.
#     The input should be a ticker, for example AAPL, TSLA.
#     """
#     for attempt in range(retries):
        # try:
        #     return yf.Ticker(ticker).insider_transactions
        # except Exception as e:
        #     msg = str(e)
        #     # yfinance 0.2/0.3 는 HTTP 오류를 그대로 문자열에 포함
        #     if "Too Many Requests" in msg and attempt < retries - 1:
        #         # 지수 back-off + 무작위 지터로 분산
        #         sleep_for = pause * (2 ** attempt) + random.uniform(0, 1)
        #         time.sleep(sleep_for)
        #         continue
        #     raise   # 다른 에러 또는 마지막 시도는 그대로 전파
#     return ticker.history(period="1y", interval="1wk")

@tool("Income Statement")
def income_stmt(ticker : str, retries: int = 3, pause: float = 2.0):
    """
    Useful to get the income statement of a company.
    The input should be a ticker, for example AAPL, TSLA.
    """
    for attempt in range(retries):
        try:
            return yf.Ticker(ticker).income_stmt
        except Exception as e:
            msg = str(e)
            # yfinance 0.2/0.3 는 HTTP 오류를 그대로 문자열에 포함
            if "Too Many Requests" in msg and attempt < retries - 1:
                # 지수 back-off + 무작위 지터로 분산
                sleep_for = pause * (2 ** attempt) + random.uniform(0, 1)
                time.sleep(sleep_for)
                continue
            raise   # 다른 에러 또는 마지막 시도는 그대로 전파
    return yf.Ticker(ticker).income_stmt

@tool("Balance Sheet")
def balance_sheet(ticker: str, retries: int = 3, pause: float = 2.0):
    """
    Useful to get the balance sheet of a company.
    The input should be a ticker, for example AAPL, TSLA.
    """
    for attempt in range(retries):
        try:
            return yf.Ticker(ticker).balance_sheet
        except Exception as e:
            msg = str(e)
            # yfinance 0.2/0.3 는 HTTP 오류를 그대로 문자열에 포함
            if "Too Many Requests" in msg and attempt < retries - 1:
                # 지수 back-off + 무작위 지터로 분산
                sleep_for = pause * (2 ** attempt) + random.uniform(0, 1)
                time.sleep(sleep_for)
                continue
            raise   # 다른 에러 또는 마지막 시도는 그대로 전파
    return yf.Ticker(ticker).balance_sheet

@tool("Insider Transactions")
def insider_transactions(ticker: str, retries: int = 3, pause: float = 2.0):
    """
    Useful to get insider transactions of a stock.
    The input should be a ticker, for example AAPL, TSLA.
    """
    for attempt in range(retries):
        try:
            return yf.Ticker(ticker).insider_transactions
        except Exception as e:
            msg = str(e)
            # yfinance 0.2/0.3 는 HTTP 오류를 그대로 문자열에 포함
            if "Too Many Requests" in msg and attempt < retries - 1:
                # 지수 back-off + 무작위 지터로 분산
                sleep_for = pause * (2 ** attempt) + random.uniform(0, 1)
                time.sleep(sleep_for)
                continue
            raise   # 다른 에러 또는 마지막 시도는 그대로 전파
    return yf.Ticker(ticker).insider_transactions

# ---------------------------------------------------------------------------
# JSON 스키마 (문자열 형태)
# ---------------------------------------------------------------------------
NEWS_SCHEMA = {
    "symbol": "string",
    "sentiment_score": "float (-1~1)",
    "top_headlines": [
        {"title": "string", "link": "string", "sentiment": "pos|neg|neu"}
    ]
}
TECH_SCHEMA = {
    "symbol": "string",
    "rsi": "float",
    "macd": {"hist": "float", "signal": "float"},
    "support_levels": ["float"],
    "resistance_levels": ["float"],
    "trend": "up|down|sideways"
}
FIN_SCHEMA = {
    "symbol": "string",
    "revenue_yoy": "float",
    "eps_yoy": "float",
    "roe": "float",
    "debt_to_equity": "float",
    "cash_flow": "float"
}
RECOMMEND_SCHEMA = {
    "symbol": "string",
    "recommendation": "BUY|SELL|HOLD",
    "report": "string (kr)",
    "score": "float (0~100)"
}

SCHEMA_STRINGS = {
    "news": json.dumps(NEWS_SCHEMA, ensure_ascii=False),
    "tech": json.dumps(TECH_SCHEMA, ensure_ascii=False),
    "fin": json.dumps(FIN_SCHEMA, ensure_ascii=False),
    "reco": json.dumps(RECOMMEND_SCHEMA, ensure_ascii=False),
}

#Stock Analysis
researcher = Agent(
    role="Researcher",
    goal="다양한 소스의 최신 뉴스를 수집·분석하여 종목 심리를 평가한다.",
    backstory="뉴스·SNS·웹사이트에서 정보를 수집하는 데이터 분석 전문가.",
    tools=[scrape_tool, stock_news],
)

technical_analyst = Agent(
    role="Technical Analyst",
    goal="가격 움직임과 기술 지표를 분석해 추세·매수·매도 지점을 도출한다.",
    backstory="차트 분석에 능통한 기술적 분석가.",
    tools=[stock_price, rsi, macd, bollinger],
)

financial_analyst = Agent(
    role="Financial Analyst",
    goal="재무제표·내부자 거래 등을 분석해 기업의 재무 건전성을 평가한다.",
    backstory="기업 가치 평가 전문가.",
    tools=[income_stmt, balance_sheet, insider_transactions],
)

hedge_fund_manager = Agent(
    role="Hedge Fund Manager",
    goal="시장·기술·재무 분석을 종합해 투자 결정을 내린다.",
    backstory="리스크 관리 중심의 한국계 헤지펀드 매니저.",
    verbose=True,
)

# qa_auditor = Agent(
#     role="QA Auditor",
#     goal="모든 리포트가 JSON 스키마를 준수하는지 검증한다.",
#     backstory="품질 보증 전문가.",
# )

#Task
research = Task(
    agent=researcher,
    description=(
        "{company} 관련 정보를 수집하라."
        " JSON 스키마:\n" + SCHEMA_STRINGS["news"]
    ),
    expected_output=SCHEMA_STRINGS["news"],
)

technical_analysis = Task(
    agent=technical_analyst,
    description=(
        "{company} 주가 데이터를 분석하고 추세·지지·저항·기술 지표를 계산하여 보고서를 작성하라."
        " JSON 스키마:\n" + SCHEMA_STRINGS["tech"]
    ),
    expected_output=SCHEMA_STRINGS["tech"],
)

financial_analysis = Task(
    agent=financial_analyst,
    description=(
        "{company} 재무제표·내부자 거래를 분석하여 재무 건전성 보고서를 작성하라."
        " JSON 스키마:\n" + SCHEMA_STRINGS["fin"]
    ),
    expected_output=SCHEMA_STRINGS["fin"],
)

investment_recommendation = Task(
    agent=hedge_fund_manager,
    context=[research, technical_analysis, financial_analysis],
    description=(
        "위 세 보고서를 종합하여 {company} 종목에 대한 투자 의견을 매수·매도·보유 중 하나로 결정하라."
        " JSON 스키마:\n" + SCHEMA_STRINGS["reco"] +
        "\n모든 설명은 한국어로 작성한다."
    ),
    expected_output=SCHEMA_STRINGS["reco"],
)

# qa_task = Task(
#     agent=qa_auditor,
#     context=[research, technical_analysis, financial_analysis, investment_recommendation],
#     description=(
#         "모든 출력이 지정된 JSON 스키마를 정확히 따르는지 검사하여 PASS 또는 FAIL 을 반환한다."
#         " 실패 시 어떤 필드가 누락/오류인지 명시한다."
#     ),
#     expected_output="PASS 또는 FAIL",
#)


#Crewai
crew = Crew(
    agents=[researcher, technical_analyst, financial_analyst, hedge_fund_manager],
    tasks=[research, technical_analysis, financial_analysis, investment_recommendation],
    verbose=True,
)

inputs={
        "company":symbol,
    }

result = crew.kickoff(inputs = inputs)

#DataBase Save
investment_report = investment_recommendation.output.raw
# print(type(investment_recommendation), investment_recommendation)

save_rmd(investment_report)
