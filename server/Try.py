from crewai.tools import tool
from crewai_tools import ScrapeWebsiteTool
from crewai import Task, Crew, Agent
from dotenv import load_dotenv
import yfinance as yf
import os
import mysql.connector
import sys

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

#DB 저장
def connect_db():
    return mysql.connector.connect(**DB_CONFIG)

# DB 연결 함수
def connect_db():
    return mysql.connector.connect(**DB_CONFIG)

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
    print(f" {symbol} Data Saved.")

#Tools
@tool("Stock News")
def stock_news(ticker: str):
    """
    Useful to get news about a stock.
    The input should be a ticker, for example AAPL, TSLA.
    """
    ticker = yf.Ticker(ticker)
    return ticker.news

scrape_tool = ScrapeWebsiteTool()

@tool("Stock Price")
def stock_price(ticker : str):
    """
    Useful to get stock price data of 1 month.
    The input should be a ticker, for example AAPL, TSLA.
    """
    ticker = yf.Ticker(ticker)
    return ticker.history(period="1mo")

# @tool("RSI")
# def RSI(ticker : str):
#     """
#     Useful to get RSI chart data of 1 month.
#     The input should be a ticker, for example AAPL, TSLA.
#     """
#     ticker = yf.Ticker(ticker)
#     return None

@tool("Stock Price 1Year")
def stock_price_1Year(ticker: str):
    """
    Useful to get stock price data of 1 Year.
    The input should be a ticker, for example AAPL, TSLA.
    """
    ticker = yf.Ticker(ticker)
    return ticker.history(period="1y", interval="1wk")

@tool("Income Statement")
def income_stmt(ticker : str):
    """
    Useful to get the income statement of a company.
    The input should be a ticker, for example AAPL, TSLA.
    """
    ticker = yf.Ticker(ticker)
    return ticker.income_stmt

@tool("Balance Sheet")
def balance_sheet(ticker: str):
    """
    Useful to get the balance sheet of a company.
    The input should be a ticker, for example AAPL, TSLA.
    """
    ticker = yf.Ticker(ticker)
    return ticker.balance_sheet

@tool("Insider Transactions")
def insider_transactions(ticker: str):
    """
    Useful to get insider transactions of a stock.
    The input should be a ticker, for example AAPL, TSLA.
    """
    ticker = yf.Ticker(ticker)
    return ticker.insider_transactions

#Stock Analysis
researcher = Agent(
    role="Researcher",
    goal="""
    Gather and interpret vast amouts of data to provide a comprehensive
    overview of the senitment and surrounding a stock.
""",
    backstory="""
    You're skilled in gathering and interpreting data from various sources.
    You read each data source carefully and extract the most important information.
    Your insights are crucial for making infromed investment decisions.
""",
    tools=[
        scrape_tool,
        stock_news
    ]
)
technical_analyst = Agent(
    role="Technical Analyst",
    goal="""
    Analyze the movements of a stock and provide insights on trends, entry points, resistance and support levels.
    """,
    backstory="""
    An expert in technical analysis, you're known for your ability to predict stock prices.
    You provide valuable insights to your customers.
""",
    tools=[
        stock_price,
        # stock_price_6month,
        stock_price_1Year,
        # stock_price_5Year,
    ]
)
financial_analyst = Agent(
    role="Financial Analyst",
    goal="""
    Use financial statements, insider trading data and other metrics to evaluate a stock's
    financial health and performance.
""",
    backstory="""
    You're a very experienced invenstment advisor that looks at a company's financial health, market sentiment,
    and qualitative data to make informed recommendations.
""",
    tools=[
        income_stmt,
        balance_sheet,
        insider_transactions
    ]
)
hedge_fund_manager = Agent(
    role="Hedge Fund Manager",
    goal="""
    Manage a portfolio of stocks by carefully evaluating risk and reward.  
    Make objective investment decisions based on a balanced view of market conditions.
""",
    backstory="""
    당신은 리스크 관리를 중요하게 생각하는 헤지펀드 매니저입니다.
    투자의 기회뿐만 아니라 위험 요소도 철저히 분석하여 신중한 결정을 내립니다.
    투자 전략은 단기 수익뿐만 아니라 장기적인 안정성도 고려해야 합니다.
    또한, 모든 분석과 투자 보고서는 **한국어로 작성해야 합니다.**
""",
    verbose=True,
)
decision_manager = Agent(
    role="Decision Manager",
    goal="주어진 주식에 대한 투자 결정을 내린다.",
    backstory="10년 경력의 투자 전문가로, 시장 분석을 통해 신속한 투자 결정을 내린다.",
    verbose=True,
)


#Task
research = Task(
    description="""
    Gather and analyze the latest news and market sentiment surrounding 
    {company}'s stock. Provide a summary of the news and any notable shifts in sentiment.
""",
    agent=researcher,
    expected_output="""
    Your financial answer MUST be a detailed summary of the news and market
    sentiment surrounding the stock.
""",
)
technical_analysis = Task(
    description="""
    Conduct a technical analysis of the {company} stock price movements and identify
    key support and resistance levels chart patterns.
    Use ALL available tools to perform technical analysis and predict stock movements.
""",
    agent=technical_analyst,
    expected_output="""
    Your final answer MUST be a report with potential entry points, price targets
    and any other relevant information.
""",
)
financial_analysis = Task(
    description="""
    Analyze the {company}'s financial statements, balance sheet, insider trading data
    and other metrics to evaluate {company}'s financial health and performance.
""",
    agent=financial_analyst,
    expected_output="""
    Your final answer MUST be a report with an overview of {company}'s revenue,
    earnings, cash flow, and other key financial metrics.
""",
)
investment_recommendation = Task(
    description="""
    Based on the research, technical analysis, and financial analysis reports, provide
    a detailed investment recommendation for {company} stock.
""",
    agent=hedge_fund_manager,
    expected_output="""
    최종 투자 추천은 **매수(BUY), 매도(SELL), 보유(HOLD)** 중 하나여야 합니다.
    선택한 추천에 대한 명확한 근거를 제시하세요.  
    재무 분석, 기술적 분석, 시장 뉴스 및 투자 심리를 고려하여 상세한 분석을 포함해야 합니다.
""",
    context=[
        research,
        technical_analysis,
        financial_analysis,
    ],
    # output_file="{company} investment.md"
)
recommandation_decision = Task(
    agent=decision_manager,
    description="""
    Based on the research, technical analysis, and financial analysis reports, provide
    an investment recommendation for {company} stock.
    
    Your response should only be one of the following: BUY, SELL, HOLD.
    Do not add any explanations or additional text.
""",
    expected_output="BUY, SELL, or HOLD (one word only)",
    context=[
        investment_recommendation,
    ],
    # output_file="{company} decision.md"
)

#Crewai
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

inputs={
        "company":symbol,
    }

result = crew.kickoff(inputs = inputs)

#DataBase Save
investment_report = investment_recommendation.output.raw
recommendation_decision = recommandation_decision.output.raw

save_rmd(inputs["company"], recommendation_decision, investment_report)
