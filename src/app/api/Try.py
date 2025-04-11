import os
import sys
import json
import psycopg2
import yfinance as yf
from crewai.tools import tool
from crewai_tools import ScrapeWebsiteTool
from crewai import Task, Crew, Agent
from dotenv import load_dotenv

# 환경변수 로드 (Vercel에서는 환경변수를 프로젝트 설정으로 관리할 수 있습니다)
load_dotenv()
os.environ["OPENAI_API_KEY"] = os.getenv("OPENAI_API_KEY")
os.environ["OPENAI_MODEL_NAME"] = os.getenv("OPENAI_MODEL_NAME")

DB_CONFIG = {
    "host": os.getenv("DB_HOST"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "database": os.getenv("DB_NAME"),
    "port": os.getenv("DB_PORT")
}

# DB 연결 함수
def connect_db():
    return psycopg2.connect(**DB_CONFIG)

# DB 저장 함수
def save_rmd(symbol, recommendation, report):
    conn = connect_db()
    cursor = conn.cursor()
    query = """
    INSERT INTO stock_recommendation (symbol, recommendation, report) VALUES (%s, %s, %s)
    """
    cursor.execute(query, (symbol, recommendation, report))
    conn.commit()
    cursor.close()
    conn.close()
    print(f"{symbol} Data Saved.")

# Tools 정의
@tool("Stock News")
def stock_news(ticker: str):
    """
    특정 종목(예: AAPL, TSLA)의 뉴스를 가져옵니다.
    """
    ticker_obj = yf.Ticker(ticker)
    return ticker_obj.news

scrape_tool = ScrapeWebsiteTool()

@tool("Stock Price")
def stock_price(ticker: str):
    """
    1개월간의 주가 데이터를 가져옵니다.
    """
    ticker_obj = yf.Ticker(ticker)
    return ticker_obj.history(period="1mo")

@tool("Stock Price 1Year")
def stock_price_1Year(ticker: str):
    """
    1년간의 주가 데이터를 (1주 단위) 가져옵니다.
    """
    ticker_obj = yf.Ticker(ticker)
    return ticker_obj.history(period="1y", interval="1wk")

@tool("Income Statement")
def income_stmt(ticker: str):
    """
    특정 종목의 손익계산서를 가져옵니다.
    """
    ticker_obj = yf.Ticker(ticker)
    return ticker_obj.income_stmt

@tool("Balance Sheet")
def balance_sheet(ticker: str):
    """
    특정 종목의 대차대조표를 가져옵니다.
    """
    ticker_obj = yf.Ticker(ticker)
    return ticker_obj.balance_sheet

@tool("Insider Transactions")
def insider_transactions(ticker: str):
    """
    특정 종목의 내부자 거래 데이터를 가져옵니다.
    """
    ticker_obj = yf.Ticker(ticker)
    return ticker_obj.insider_transactions

# Agents 및 Task 정의

# 연구원(Researcher): 뉴스 및 시장 심리를 분석
researcher = Agent(
    role="Researcher",
    goal="""
    최신 뉴스와 시장 심리를 분석하여 주식 주변의 동향 및 분위기에 대한 포괄적인 개요를 제공합니다.
    """,
    backstory="""
    다양한 소스의 데이터를 읽고 해석하는 능력이 뛰어납니다.
    신중한 분석 결과를 바탕으로 투자 결정을 지원합니다.
    """,
    tools=[scrape_tool, stock_news]
)

# 기술적 분석가(Technical Analyst): 주가 흐름 및 차트 분석
technical_analyst = Agent(
    role="Technical Analyst",
    goal="""
    주가의 움직임을 분석하여 주요 지지/저항선 및 패턴을 식별합니다.
    """,
    backstory="""
    차트 분석 분야의 전문가로서 주가 예측에 유용한 정보를 제공합니다.
    """,
    tools=[stock_price]
)

# 재무 분석가(Financial Analyst): 재무제표 및 내부자 거래 데이터 분석
financial_analyst = Agent(
    role="Financial Analyst",
    goal="""
    재무제표, 대차대조표, 내부자 거래 데이터 등을 활용해 기업의 재무 건전성을 평가합니다.
    """,
    backstory="""
    풍부한 경험을 바탕으로 기업의 재무 상태와 성과를 면밀히 분석합니다.
    """,
    tools=[income_stmt, balance_sheet, insider_transactions]
)

# 헤지펀드 매니저(Hedge Fund Manager): 종합 분석을 바탕으로 투자 전략 수립 (분석 및 추천 보고서 한국어 작성)
hedge_fund_manager = Agent(
    role="Hedge Fund Manager",
    goal="""
    시장 상황을 고려하여 리스크와 수익률을 균형있게 평가, 객관적인 투자 결정을 내립니다.
    """,
    backstory="""
    당신은 리스크 관리를 중시하는 헤지펀드 매니저입니다.
    투자 기회와 위험 요인을 철저히 분석하여 신중하게 결정하며,
    분석 및 추천 보고서는 모두 **한국어**로 작성됩니다.
    """,
    verbose=True,
)

# 최종 투자 결정(Decision Manager): 최종 투자 추천(BUY, SELL, HOLD) 결정 (한 단어만 응답)
decision_manager = Agent(
    role="Decision Manager",
    goal="주어진 주식에 대한 투자 결정을 내립니다.",
    backstory="10년 경력의 투자 전문가로서, 시장 분석 기반의 신속한 결정을 내립니다.",
    verbose=True,
)

# Task 구성
research = Task(
    description="""
    {company} 주식에 관한 최신 뉴스와 시장 심리를 수집 및 분석합니다.
    """,
    agent=researcher,
    expected_output="""
    주식 뉴스 및 시장 심리에 대한 상세 분석 요약을 작성해야 합니다.
    """
)

technical_analysis = Task(
    description="""
    {company} 주식의 차트와 주가 움직임을 분석해 주요 지지/저항선, 패턴 등을 식별합니다.
    모든 도구를 활용해 분석 및 예측을 실시합니다.
    """,
    agent=technical_analyst,
    expected_output="""
    진입 포인트, 가격 목표 및 기타 주요 정보를 포함한 상세 보고서를 작성해야 합니다.
    """
)

financial_analysis = Task(
    description="""
    {company} 의 재무제표, 대차대조표, 내부자 거래 데이터 등을 분석하여 재무 건전성을 평가합니다.
    """,
    agent=financial_analyst,
    expected_output="""
    {company} 의 매출, 이익, 현금 흐름 및 기타 주요 재무 지표에 대한 개요 보고서를 작성해야 합니다.
    """
)

investment_recommendation = Task(
    description="""
    앞선 연구, 기술적 분석, 재무 분석 보고서를 바탕으로 {company} 주식에 대한 상세 투자 추천 보고서를 작성합니다.
    """,
    agent=hedge_fund_manager,
    expected_output="""
    최종 투자 추천은 **매수(BUY), 매도(SELL), 보유(HOLD)** 중 하나여야 하며,
    명확한 근거와 함께 상세한 분석을 포함해야 합니다.
    """,
    context=[research, technical_analysis, financial_analysis],
)

recommandation_decision = Task(
    agent=decision_manager,
    description="""
    앞선 모든 분석 보고서를 토대로 {company} 주식에 대해 BUY, SELL, HOLD 중 하나의 최종 투자의사를 결정합니다.
    응답은 한 단어(BUY, SELL, or HOLD)로만 작성합니다.
    """,
    expected_output="BUY, SELL, or HOLD (one word only)",
    context=[investment_recommendation],
)

# Crewai Crew 정의
crew = Crew(
    tasks=[
        research,
        technical_analysis,
        financial_analysis,
        investment_recommendation,
        recommandation_decision,
    ],
    agents=[
        researcher,
        technical_analyst,
        financial_analyst,
        hedge_fund_manager,
        decision_manager,
    ],
    verbose=True,
)

# Vercel Serverless Function 엔트리포인트
def handler(request):
    """
    Vercel Python Serverless Function 엔트리포인트.
    GET 요청에서는 query string, POST 요청에서는 JSON body에서 "symbol" 키를 읽습니다.
    """
    # 요청에서 심볼을 읽기 (대소문자 구분 없이)
    symbol = None
    if request.method == "GET":
        params = request.query
        symbol = params.get("symbol")
    elif request.method == "POST":
        try:
            body = request.get_json()
            symbol = body.get("symbol")
        except Exception as e:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Invalid JSON body", "details": str(e)}),
            }

    if not symbol:
        return {
            "statusCode": 400,
            "body": json.dumps({"error": "No symbol provided. Please provide a 'symbol' parameter."}),
        }

    inputs = {"company": symbol}

    try:
        # Crewai workflow 실행
        result = crew.kickoff(inputs=inputs)
    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps({"error": "Error during crew kickoff", "details": str(e)}),
        }

    # 각 task의 최종 출력을 가져옵니다.
    investment_report = investment_recommendation.output.raw
    recommendation_decision = recommandation_decision.output.raw

    # DB에 저장 (저장 중 에러 발생 시 로깅)
    try:
        save_rmd(symbol, recommendation_decision, investment_report)
    except Exception as e:
        print(f"DB save error: {e}")

    response_body = {
        "recommendation": recommendation_decision,
        "report": investment_report
    }

    return {
        "statusCode": 200,
        "body": json.dumps(response_body, ensure_ascii=False)
    }