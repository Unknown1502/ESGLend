from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
import io

from app.database.session import get_db
from app.core.authorization import get_current_user
from app.models.models import User
from app.services.lma_standardization_service import LMAStandardizationService


router = APIRouter()


@router.get("/lma/{loan_id}", status_code=status.HTTP_200_OK)
async def export_lma_format(
    loan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Export loan data in LMA standard format.
    
    Returns comprehensive loan documentation in LMA-compliant structure including:
    - Facility information
    - Parties and agents
    - Pricing and fees
    - Sustainability-linked structure
    - Covenants and compliance
    - Verification framework
    
    - **loan_id**: The ID of the loan to export
    """
    try:
        lma_service = LMAStandardizationService(db)
        lma_data = lma_service.export_loan_to_lma_format(loan_id)
        
        return {
            "loan_id": loan_id,
            "export_date": datetime.now().isoformat(),
            "format": "LMA_SUSTAINABILITY_LINKED_LOAN",
            "version": "LMA_SLL_2023",
            "data": lma_data
        }
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error exporting to LMA format: {str(e)}"
        )


@router.get("/lma/{loan_id}/json", status_code=status.HTTP_200_OK)
async def export_lma_json(
    loan_id: int,
    download: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Export loan data to LMA-formatted JSON file.
    
    - **loan_id**: The ID of the loan to export
    - **download**: If true, returns as downloadable file; if false, returns inline
    """
    try:
        lma_service = LMAStandardizationService(db)
        json_data = lma_service.export_to_json(loan_id)
        
        from app.models.models import Loan
        loan = db.query(Loan).filter(Loan.id == loan_id).first()
        filename = f"loan_{loan.loan_number}_lma_export_{datetime.now().strftime('%Y%m%d')}.json"
        
        if download:
            return Response(
                content=json_data,
                media_type="application/json",
                headers={
                    "Content-Disposition": f"attachment; filename={filename}"
                }
            )
        else:
            return Response(content=json_data, media_type="application/json")
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error exporting to JSON: {str(e)}"
        )


@router.get("/lma/{loan_id}/xml", status_code=status.HTTP_200_OK)
async def export_lma_xml(
    loan_id: int,
    download: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Export loan data to LMA-formatted XML file.
    
    - **loan_id**: The ID of the loan to export
    - **download**: If true, returns as downloadable file; if false, returns inline
    """
    try:
        lma_service = LMAStandardizationService(db)
        xml_data = lma_service.export_to_xml(loan_id)
        
        from app.models.models import Loan
        loan = db.query(Loan).filter(Loan.id == loan_id).first()
        filename = f"loan_{loan.loan_number}_lma_export_{datetime.now().strftime('%Y%m%d')}.xml"
        
        if download:
            return Response(
                content=xml_data,
                media_type="application/xml",
                headers={
                    "Content-Disposition": f"attachment; filename={filename}"
                }
            )
        else:
            return Response(content=xml_data, media_type="application/xml")
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error exporting to XML: {str(e)}"
        )


@router.get("/formats", status_code=status.HTTP_200_OK)
async def get_export_formats(
    current_user: User = Depends(get_current_user)
):
    """
    Get available export formats and their specifications.
    
    Returns information about supported export formats.
    """
    return {
        "formats": [
            {
                "format": "LMA_JSON",
                "name": "LMA Standard JSON",
                "description": "LMA Sustainability-Linked Loan documentation in JSON format",
                "version": "LMA_SLL_2023",
                "mime_type": "application/json",
                "file_extension": ".json"
            },
            {
                "format": "LMA_XML",
                "name": "LMA Standard XML",
                "description": "LMA Sustainability-Linked Loan documentation in XML format",
                "version": "LMA_SLL_2023",
                "mime_type": "application/xml",
                "file_extension": ".xml"
            }
        ],
        "lma_field_mappings": {
            "loan_facility": [
                "facility_id", "facility_name", "facility_type", "facility_amount",
                "currency", "purpose", "tenor"
            ],
            "pricing": [
                "base_rate", "margin", "all_in_rate", "pricing_adjustment_mechanism"
            ],
            "sustainability_linked": [
                "sl_designation", "kpi_framework", "target_observation_date", 
                "pricing_adjustment_mechanism"
            ],
            "compliance": [
                "financial_covenants", "esg_covenants", "verification_requirements"
            ]
        }
    }


@router.post("/bulk", status_code=status.HTTP_200_OK)
async def bulk_export_loans(
    loan_ids: list[int],
    format: str = "json",
    template_id: Optional[int] = None,
    field_mappings: Optional[list] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Export multiple loans in LMA format.
    
    - **loan_ids**: List of loan IDs to export
    - **format**: Export format (json or xml)
    - **template_id**: Optional template ID to use
    - **field_mappings**: Optional custom field mappings
    """
    try:
        lma_service = LMAStandardizationService(db)
        
        exports = []
        errors = []
        
        for loan_id in loan_ids:
            try:
                if format.lower() == "json":
                    data = lma_service.export_to_json(loan_id)
                elif format.lower() == "xml":
                    data = lma_service.export_to_xml(loan_id)
                else:
                    raise ValueError(f"Unsupported format: {format}")
                
                exports.append({
                    "loan_id": loan_id,
                    "status": "success",
                    "data": data
                })
            except Exception as e:
                errors.append({
                    "loan_id": loan_id,
                    "status": "error",
                    "error": str(e)
                })
        
        return {
            "total_requested": len(loan_ids),
            "total_successful": len(exports),
            "total_errors": len(errors),
            "format": format,
            "export_date": datetime.now().isoformat(),
            "exports": exports,
            "errors": errors
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error performing bulk export: {str(e)}"
        )


@router.get("/templates", status_code=status.HTTP_200_OK)
async def get_export_templates(
    current_user: User = Depends(get_current_user)
):
    """
    Get available export templates.
    
    Returns list of available export templates for loan data.
    """
    return {
        "templates": [
            {
                "id": 1,
                "name": "LMA Standard Format",
                "description": "Standard LMA export format for loan data",
                "format": "json",
                "template_type": "facility_agreement",
                "is_default": True,
                "created_date": "2024-01-01T00:00:00",
                "field_mappings": [
                    {"source_field": "loan_number", "target_field": "DealId", "data_type": "string", "required": True},
                    {"source_field": "borrower_name", "target_field": "BorrowerName", "data_type": "string", "required": True},
                    {"source_field": "loan_amount", "target_field": "OriginalAmount", "data_type": "decimal", "required": True},
                    {"source_field": "currency", "target_field": "Currency", "data_type": "string", "required": True}
                ]
            },
            {
                "id": 2,
                "name": "LMA XML Format",
                "description": "XML format for LMA compliance",
                "format": "xml",
                "template_type": "facility_agreement",
                "is_default": False,
                "created_date": "2024-01-01T00:00:00",
                "field_mappings": [
                    {"source_field": "loan_number", "target_field": "DealId", "data_type": "string", "required": True},
                    {"source_field": "borrower_name", "target_field": "BorrowerName", "data_type": "string", "required": True}
                ]
            },
            {
                "id": 3,
                "name": "SFDR Compliance Report",
                "description": "Export format for SFDR regulatory reporting",
                "format": "json",
                "template_type": "esg_report",
                "is_default": False,
                "created_date": "2024-01-01T00:00:00",
                "field_mappings": [
                    {"source_field": "sustainability_linked", "target_field": "SustainabilityLinked", "data_type": "boolean", "required": True},
                    {"source_field": "esg_performance_score", "target_field": "ESGPerformanceScore", "data_type": "decimal", "required": False}
                ]
            }
        ]
    }


@router.get("/history", status_code=status.HTTP_200_OK)
async def get_export_history(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get export history for the current user.
    
    Args:
        limit: Maximum number of records to return
    
    Returns:
        List of recent exports
    """
    return {
        "exports": [],
        "total": 0,
        "message": "Export history feature coming soon"
    }


@router.get("/field-definitions", status_code=status.HTTP_200_OK)
async def get_field_definitions(
    current_user: User = Depends(get_current_user)
):
    """
    Get LMA field definitions and metadata.
    
    Returns dictionary of LMA field definitions with types and requirements.
    """
    return {
        "source_fields": [
            {"name": "loan_number", "label": "Loan Number", "data_type": "string", "sample_value": "SLL-2024-001"},
            {"name": "borrower_name", "label": "Borrower Name", "data_type": "string", "sample_value": "GreenTech Industries"},
            {"name": "loan_amount", "label": "Loan Amount", "data_type": "decimal", "sample_value": "5000000.00"},
            {"name": "currency", "label": "Currency", "data_type": "string", "sample_value": "USD"},
            {"name": "origination_date", "label": "Origination Date", "data_type": "date", "sample_value": "2024-01-15"},
            {"name": "maturity_date", "label": "Maturity Date", "data_type": "date", "sample_value": "2029-01-15"},
            {"name": "sustainability_linked", "label": "Sustainability Linked", "data_type": "boolean", "sample_value": "true"},
            {"name": "esg_performance_score", "label": "ESG Score", "data_type": "decimal", "sample_value": "85.5"}
        ],
        "target_fields": [
            {"name": "DealName", "label": "Deal Name", "data_type": "string", "required": True, "lma_section": "General Information"},
            {"name": "DealId", "label": "Deal ID", "data_type": "integer", "required": True, "lma_section": "General Information"},
            {"name": "BorrowerName", "label": "Borrower Name", "data_type": "string", "required": True, "lma_section": "General Information"},
            {"name": "OriginalAmount", "label": "Original Amount", "data_type": "decimal", "required": True, "lma_section": "Financial Terms"},
            {"name": "Currency", "label": "Currency", "data_type": "string", "required": True, "lma_section": "Financial Terms"},
            {"name": "OriginationDate", "label": "Origination Date", "data_type": "date", "required": True, "lma_section": "Financial Terms"},
            {"name": "MaturityDate", "label": "Maturity Date", "data_type": "date", "required": True, "lma_section": "Financial Terms"},
            {"name": "SustainabilityLinked", "label": "Sustainability Linked", "data_type": "boolean", "required": True, "lma_section": "ESG Provisions"},
            {"name": "ESGPerformanceScore", "label": "ESG Performance Score", "data_type": "decimal", "required": False, "lma_section": "ESG Provisions"},
            {"name": "FinancialCovenant1", "label": "Financial Covenant 1", "data_type": "string", "required": False, "lma_section": "Covenants"},
            {"name": "ESGCovenant1", "label": "ESG Covenant 1", "data_type": "string", "required": False, "lma_section": "Covenants"}
        ]
    }


@router.get("/field-mappings", status_code=status.HTTP_200_OK)
async def get_field_mappings(
    current_user: User = Depends(get_current_user)
):
    """
    Get LMA standard field mappings.
    
    Returns complete field mapping documentation showing how internal
    data maps to LMA standard fields.
    """
    lma_service = LMAStandardizationService(None)
    return {
        "lma_field_mappings": lma_service.lma_field_mappings,
        "mapping_version": "LMA_SLL_2023",
        "last_updated": "2024-01-01"
    }
