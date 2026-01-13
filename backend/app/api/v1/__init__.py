from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth,
    loans,
    borrowers,
    esg_kpis,
    covenants,
    verifications,
    dashboard,
    reports,
    data_sources,
    api_status,
    pricing,
    risk,
    sfdr,
    collaboration,
    export
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(loans.router, prefix="/loans", tags=["Loans"])
api_router.include_router(borrowers.router, prefix="/borrowers", tags=["Borrowers"])
api_router.include_router(esg_kpis.router, prefix="/esg-kpis", tags=["ESG KPIs"])
api_router.include_router(covenants.router, prefix="/covenants", tags=["Covenants"])
api_router.include_router(verifications.router, prefix="/verifications", tags=["Verifications"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])
api_router.include_router(data_sources.router, prefix="/data-sources", tags=["Data Sources"])
api_router.include_router(api_status.router, prefix="/api-status", tags=["API Status"])
api_router.include_router(pricing.router, prefix="/pricing", tags=["Loan Pricing"])
api_router.include_router(risk.router, prefix="/risk", tags=["Risk Assessment"])
api_router.include_router(sfdr.router, prefix="/sfdr", tags=["SFDR Compliance"])
api_router.include_router(collaboration.router, prefix="/collaboration", tags=["Multi-Party Collaboration"])
api_router.include_router(export.router, prefix="/export", tags=["LMA Export"])
