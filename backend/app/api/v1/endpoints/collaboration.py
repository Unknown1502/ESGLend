from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Optional
from datetime import datetime
from pydantic import BaseModel, Field

from app.database.session import get_db
from app.core.authorization import get_current_user
from app.models.models import User
from app.services.collaboration_service import CollaborationService


router = APIRouter()


class CreateWorkflowRequest(BaseModel):
    """Request model for creating a workflow."""
    loan_id: int = Field(..., description="Loan ID")
    workflow_type: str = Field(..., description="Workflow type")
    title: str = Field(..., description="Workflow title")
    description: str = Field(..., description="Workflow description")
    due_date: Optional[str] = Field(None, description="Due date (ISO format)")
    metadata: Optional[Dict] = Field(None, description="Additional metadata")


class AssignStageRequest(BaseModel):
    """Request model for assigning a stage."""
    workflow_id: int = Field(..., description="Workflow ID")
    stage_name: str = Field(..., description="Stage name")
    user_id: int = Field(..., description="User ID to assign")


class CompleteStageRequest(BaseModel):
    """Request model for completing a stage."""
    workflow_id: int = Field(..., description="Workflow ID")
    stage_name: str = Field(..., description="Stage name")
    decision: str = Field(..., description="Decision: approved, rejected, revision_required")
    comments: Optional[str] = Field(None, description="Comments")
    documents: Optional[List[Dict]] = Field(None, description="Supporting documents")


class AddCommentRequest(BaseModel):
    """Request model for adding a comment."""
    workflow_id: int = Field(..., description="Workflow ID")
    comment: str = Field(..., description="Comment text")
    stage_name: Optional[str] = Field(None, description="Stage name")


@router.get("/workflows", status_code=status.HTTP_200_OK)
async def get_workflows(
    loan_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all workflows, optionally filtered by loan_id.
    
    - **loan_id**: Optional filter by loan ID
    """
    try:
        collaboration_service = CollaborationService(db)
        workflows = collaboration_service.get_workflows(loan_id=loan_id)
        return {
            "total": len(workflows),
            "workflows": workflows
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving workflows: {str(e)}"
        )


@router.post("/workflows", status_code=status.HTTP_201_CREATED)
async def create_workflow(
    request: CreateWorkflowRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new multi-party collaboration workflow.
    
    Available workflow types:
    - loan_approval: Complete loan approval process
    - verification_approval: Verification document approval
    - covenant_modification: Covenant modification request
    - kpi_target_adjustment: ESG KPI target adjustment
    - report_generation: Report generation and review
    
    - **loan_id**: The ID of the loan
    - **workflow_type**: Type of workflow to create
    - **title**: Workflow title
    - **description**: Workflow description
    - **due_date**: Optional due date (ISO format)
    - **metadata**: Optional additional metadata
    """
    try:
        collaboration_service = CollaborationService(db)
        
        due_date_obj = None
        if request.due_date:
            due_date_obj = datetime.fromisoformat(request.due_date.replace('Z', '+00:00'))
        
        result = collaboration_service.create_workflow(
            loan_id=request.loan_id,
            workflow_type=request.workflow_type,
            initiated_by=current_user.id,
            title=request.title,
            description=request.description,
            due_date=due_date_obj,
            metadata=request.metadata
        )
        
        return result
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating workflow: {str(e)}"
        )


@router.post("/workflows/assign-stage", status_code=status.HTTP_200_OK)
async def assign_stage(
    request: AssignStageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Assign a workflow stage to a specific user.
    
    - **workflow_id**: The ID of the workflow
    - **stage_name**: Name of the stage to assign
    - **user_id**: ID of user to assign stage to
    """
    try:
        collaboration_service = CollaborationService(db)
        result = collaboration_service.assign_stage_to_user(
            workflow_id=request.workflow_id,
            stage_name=request.stage_name,
            user_id=request.user_id,
            assigned_by=current_user.id
        )
        return result
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error assigning stage: {str(e)}"
        )


@router.post("/workflows/complete-stage", status_code=status.HTTP_200_OK)
async def complete_stage(
    request: CompleteStageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Complete a workflow stage with a decision.
    
    - **workflow_id**: The ID of the workflow
    - **stage_name**: Name of the stage to complete
    - **decision**: Decision (approved, rejected, revision_required)
    - **comments**: Optional comments
    - **documents**: Optional supporting documents
    """
    try:
        collaboration_service = CollaborationService(db)
        result = collaboration_service.complete_stage(
            workflow_id=request.workflow_id,
            stage_name=request.stage_name,
            completed_by=current_user.id,
            decision=request.decision,
            comments=request.comments,
            documents=request.documents
        )
        return result
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error completing stage: {str(e)}"
        )


@router.get("/workflows/{workflow_id}", status_code=status.HTTP_200_OK)
async def get_workflow(
    workflow_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed workflow status.
    
    Returns complete workflow information including approval chain and progress.
    
    - **workflow_id**: The ID of the workflow
    """
    try:
        collaboration_service = CollaborationService(db)
        result = collaboration_service.get_workflow_status(workflow_id)
        return result
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving workflow: {str(e)}"
        )


@router.get("/workflows/loan/{loan_id}", status_code=status.HTTP_200_OK)
async def get_loan_workflows(
    loan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all workflows for a specific loan.
    
    - **loan_id**: The ID of the loan
    """
    try:
        collaboration_service = CollaborationService(db)
        workflows = collaboration_service.get_loan_workflows(loan_id)
        return {
            "loan_id": loan_id,
            "total_workflows": len(workflows),
            "workflows": workflows
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving workflows: {str(e)}"
        )


@router.get("/tasks/pending", status_code=status.HTTP_200_OK)
async def get_pending_tasks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all pending workflow tasks for the current user.
    
    Returns tasks that require the user's attention.
    """
    try:
        collaboration_service = CollaborationService(db)
        tasks = collaboration_service.get_user_pending_tasks(current_user.id)
        return {
            "user_id": current_user.id,
            "user_email": current_user.email,
            "total_pending_tasks": len(tasks),
            "tasks": tasks
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving pending tasks: {str(e)}"
        )


@router.post("/workflows/comment", status_code=status.HTTP_200_OK)
async def add_comment(
    request: AddCommentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Add a comment to a workflow.
    
    - **workflow_id**: The ID of the workflow
    - **comment**: Comment text
    - **stage_name**: Optional stage name to associate comment with
    """
    try:
        collaboration_service = CollaborationService(db)
        result = collaboration_service.add_comment_to_workflow(
            workflow_id=request.workflow_id,
            user_id=current_user.id,
            comment=request.comment,
            stage_name=request.stage_name
        )
        return result
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error adding comment: {str(e)}"
        )


@router.get("/workflow-types", status_code=status.HTTP_200_OK)
async def get_workflow_types(
    current_user: User = Depends(get_current_user)
):
    """
    Get available workflow types and their configurations.
    
    Returns all available workflow types with their approval chain structures.
    """
    collaboration_service = CollaborationService(None)
    return {
        "workflow_types": collaboration_service.workflow_types
    }
