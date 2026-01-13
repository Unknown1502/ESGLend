from datetime import datetime, timedelta
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from app.models.models import (
    CollaborationWorkflow, User, Loan, Verification, 
    ESGKpi, Covenant, Report
)


class CollaborationService:
    """
    Multi-party collaboration and workflow management service.
    Enables different stakeholders to collaborate on loan verification and approval processes.
    """
    
    def __init__(self, db: Session):
        self.db = db
        
        # Define workflow types and their approval chains
        self.workflow_types = {
            "loan_approval": {
                "name": "Loan Approval Workflow",
                "stages": ["credit_analysis", "esg_review", "risk_assessment", "final_approval"],
                "required_roles": ["analyst", "esg_manager", "risk_manager", "senior_manager"]
            },
            "verification_approval": {
                "name": "Verification Document Approval",
                "stages": ["document_upload", "esg_specialist_review", "auditor_review", "borrower_acknowledgment"],
                "required_roles": ["borrower", "esg_specialist", "auditor", "lender"]
            },
            "covenant_modification": {
                "name": "Covenant Modification Request",
                "stages": ["borrower_request", "analyst_review", "legal_review", "approval"],
                "required_roles": ["borrower", "analyst", "legal", "senior_manager"]
            },
            "kpi_target_adjustment": {
                "name": "ESG KPI Target Adjustment",
                "stages": ["borrower_proposal", "esg_review", "risk_assessment", "approval"],
                "required_roles": ["borrower", "esg_specialist", "risk_manager", "lender"]
            },
            "report_generation": {
                "name": "Report Generation and Review",
                "stages": ["draft_creation", "internal_review", "borrower_review", "publication"],
                "required_roles": ["analyst", "senior_manager", "borrower", "lender"]
            }
        }
    
    def create_workflow(
        self,
        loan_id: int,
        workflow_type: str,
        initiated_by: int,
        title: str,
        description: str,
        due_date: Optional[datetime] = None,
        metadata: Optional[Dict] = None
    ) -> Dict:
        """Create new workflow for multi-party collaboration."""
        if workflow_type not in self.workflow_types:
            raise ValueError(f"Invalid workflow type: {workflow_type}")
        
        loan = self.db.query(Loan).filter(Loan.id == loan_id).first()
        if not loan:
            raise ValueError(f"Loan with ID {loan_id} not found")
        
        initiator = self.db.query(User).filter(User.id == initiated_by).first()
        if not initiator:
            raise ValueError(f"User with ID {initiated_by} not found")
        
        workflow_config = self.workflow_types[workflow_type]
        
        # Set default due date if not provided
        if not due_date:
            due_date = datetime.now() + timedelta(days=14)
        
        # Initialize approval chain
        approval_chain = []
        for idx, (stage, role) in enumerate(zip(workflow_config["stages"], workflow_config["required_roles"])):
            approval_chain.append({
                "stage": stage,
                "stage_order": idx + 1,
                "required_role": role,
                "status": "pending" if idx > 0 else "in_progress",
                "assigned_user_id": None,
                "completed_by": None,
                "completed_date": None,
                "comments": None,
                "documents": []
            })
        
        # Create workflow
        workflow = CollaborationWorkflow(
            loan_id=loan_id,
            workflow_type=workflow_type,
            title=title,
            description=description,
            initiated_by=initiated_by,
            current_stage=workflow_config["stages"][0],
            status="in_progress",
            approval_chain=approval_chain,
            due_date=due_date,
            created_date=datetime.now(),
            metadata=metadata or {}
        )
        self.db.add(workflow)
        self.db.commit()
        self.db.refresh(workflow)
        
        return {
            "workflow_id": workflow.id,
            "loan_id": loan_id,
            "workflow_type": workflow_type,
            "title": title,
            "current_stage": workflow.current_stage,
            "status": workflow.status,
            "approval_chain": approval_chain,
            "due_date": due_date.isoformat(),
            "initiated_by": {
                "id": initiator.id,
                "email": initiator.email,
                "full_name": initiator.full_name
            },
            "created_date": workflow.created_date.isoformat()
        }
    
    def assign_stage_to_user(
        self,
        workflow_id: int,
        stage_name: str,
        user_id: int,
        assigned_by: int
    ) -> Dict:
        """Assign workflow stage to specific user."""
        workflow = self.db.query(CollaborationWorkflow).filter(
            CollaborationWorkflow.id == workflow_id
        ).first()
        
        if not workflow:
            raise ValueError(f"Workflow with ID {workflow_id} not found")
        
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError(f"User with ID {user_id} not found")
        
        # Update approval chain
        approval_chain = workflow.approval_chain
        stage_found = False
        
        for stage in approval_chain:
            if stage["stage"] == stage_name:
                stage["assigned_user_id"] = user_id
                stage_found = True
                break
        
        if not stage_found:
            raise ValueError(f"Stage '{stage_name}' not found in workflow")
        
        workflow.approval_chain = approval_chain
        workflow.updated_date = datetime.now()
        self.db.commit()
        
        return {
            "workflow_id": workflow_id,
            "stage": stage_name,
            "assigned_to": {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name
            },
            "assigned_date": datetime.now().isoformat()
        }
    
    def complete_stage(
        self,
        workflow_id: int,
        stage_name: str,
        completed_by: int,
        decision: str,
        comments: Optional[str] = None,
        documents: Optional[List[Dict]] = None
    ) -> Dict:
        """Complete workflow stage and move to next stage."""
        workflow = self.db.query(CollaborationWorkflow).filter(
            CollaborationWorkflow.id == workflow_id
        ).first()
        
        if not workflow:
            raise ValueError(f"Workflow with ID {workflow_id} not found")
        
        if decision not in ["approved", "rejected", "revision_required"]:
            raise ValueError(f"Invalid decision: {decision}")
        
        user = self.db.query(User).filter(User.id == completed_by).first()
        if not user:
            raise ValueError(f"User with ID {completed_by} not found")
        
        # Update current stage
        approval_chain = workflow.approval_chain
        current_stage_idx = None
        
        for idx, stage in enumerate(approval_chain):
            if stage["stage"] == stage_name:
                stage["status"] = decision
                stage["completed_by"] = completed_by
                stage["completed_date"] = datetime.now().isoformat()
                stage["comments"] = comments
                if documents:
                    stage["documents"] = documents
                current_stage_idx = idx
                break
        
        if current_stage_idx is None:
            raise ValueError(f"Stage '{stage_name}' not found")
        
        # Determine next action
        if decision == "rejected":
            workflow.status = "rejected"
            workflow.completed_date = datetime.now()
        elif decision == "revision_required":
            workflow.status = "revision_required"
            # Move back to previous stage if applicable
            if current_stage_idx > 0:
                approval_chain[current_stage_idx - 1]["status"] = "in_progress"
                workflow.current_stage = approval_chain[current_stage_idx - 1]["stage"]
        else:  # approved
            # Move to next stage
            if current_stage_idx < len(approval_chain) - 1:
                approval_chain[current_stage_idx + 1]["status"] = "in_progress"
                workflow.current_stage = approval_chain[current_stage_idx + 1]["stage"]
                workflow.status = "in_progress"
            else:
                # Last stage completed
                workflow.status = "approved"
                workflow.completed_date = datetime.now()
        
        workflow.approval_chain = approval_chain
        workflow.updated_date = datetime.now()
        self.db.commit()
        
        return {
            "workflow_id": workflow_id,
            "stage_completed": stage_name,
            "decision": decision,
            "completed_by": {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name
            },
            "next_stage": workflow.current_stage,
            "workflow_status": workflow.status,
            "approval_chain": approval_chain
        }
    
    def get_user_pending_tasks(self, user_id: int) -> List[Dict]:
        """Get all pending workflow tasks for a user."""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError(f"User with ID {user_id} not found")
        
        # Get all active workflows
        workflows = self.db.query(CollaborationWorkflow).filter(
            CollaborationWorkflow.status.in_(["in_progress", "revision_required"])
        ).all()
        
        pending_tasks = []
        
        for workflow in workflows:
            approval_chain = workflow.approval_chain
            
            for stage in approval_chain:
                # Check if stage is assigned to this user and pending
                if (stage.get("assigned_user_id") == user_id and 
                    stage.get("status") in ["in_progress", "pending"]):
                    
                    loan = self.db.query(Loan).filter(Loan.id == workflow.loan_id).first()
                    
                    pending_tasks.append({
                        "workflow_id": workflow.id,
                        "workflow_type": workflow.workflow_type,
                        "title": workflow.title,
                        "loan_number": loan.loan_number if loan else None,
                        "borrower": loan.borrower.name if loan and loan.borrower else None,
                        "current_stage": stage["stage"],
                        "stage_order": stage["stage_order"],
                        "required_role": stage["required_role"],
                        "due_date": workflow.due_date.isoformat() if workflow.due_date else None,
                        "days_remaining": (workflow.due_date - datetime.now()).days if workflow.due_date else None,
                        "priority": "high" if workflow.due_date and (workflow.due_date - datetime.now()).days < 3 else "normal"
                    })
        
        # Sort by due date
        pending_tasks.sort(key=lambda x: x["due_date"] if x["due_date"] else "9999-12-31")
        
        return pending_tasks
    
    def get_workflows(self, loan_id: Optional[int] = None) -> List[Dict]:
        """
        Get all workflows, optionally filtered by loan_id.
        
        Args:
            loan_id: Optional loan ID to filter workflows
        
        Returns:
            List of workflows with basic information
        """
        query = self.db.query(CollaborationWorkflow)
        
        if loan_id:
            query = query.filter(CollaborationWorkflow.loan_id == loan_id)
        
        workflows = query.order_by(CollaborationWorkflow.created_date.desc()).all()
        
        result = []
        for wf in workflows:
            loan = self.db.query(Loan).filter(Loan.id == wf.loan_id).first()
            initiator = self.db.query(User).filter(User.id == wf.initiated_by).first()
            
            # Safely get borrower name
            borrower_name = None
            if loan:
                try:
                    if hasattr(loan, 'borrower') and loan.borrower:
                        borrower_name = loan.borrower.name
                except Exception:
                    borrower_name = None
            
            result.append({
                "workflow_id": wf.id,
                "loan_id": wf.loan_id,
                "loan_number": loan.loan_number if loan else None,
                "borrower": borrower_name,
                "workflow_type": wf.workflow_type,
                "title": wf.title,
                "description": wf.description,
                "status": wf.status,
                "current_stage": wf.current_stage,
                "initiated_by": {
                    "id": initiator.id,
                    "email": initiator.email,
                    "full_name": initiator.full_name
                } if initiator else None,
                "created_date": wf.created_date.isoformat(),
                "due_date": wf.due_date.isoformat() if wf.due_date else None,
                "completed_date": wf.completed_date.isoformat() if wf.completed_date else None
            })
        
        return result
    
    def get_workflow_status(self, workflow_id: int) -> Dict:
        """Get detailed workflow status."""
        workflow = self.db.query(CollaborationWorkflow).filter(
            CollaborationWorkflow.id == workflow_id
        ).first()
        
        if not workflow:
            raise ValueError(f"Workflow with ID {workflow_id} not found")
        
        loan = self.db.query(Loan).filter(Loan.id == workflow.loan_id).first()
        initiator = self.db.query(User).filter(User.id == workflow.initiated_by).first()
        
        # Calculate progress
        total_stages = len(workflow.approval_chain)
        completed_stages = sum(
            1 for stage in workflow.approval_chain 
            if stage.get("status") == "approved"
        )
        progress_percentage = (completed_stages / total_stages * 100) if total_stages > 0 else 0
        
        # Enrich approval chain with user details
        enriched_chain = []
        for stage in workflow.approval_chain:
            stage_data = dict(stage)
            
            if stage.get("assigned_user_id"):
                user = self.db.query(User).filter(User.id == stage["assigned_user_id"]).first()
                if user:
                    stage_data["assigned_user"] = {
                        "id": user.id,
                        "email": user.email,
                        "full_name": user.full_name
                    }
            
            if stage.get("completed_by"):
                user = self.db.query(User).filter(User.id == stage["completed_by"]).first()
                if user:
                    stage_data["completed_by_user"] = {
                        "id": user.id,
                        "email": user.email,
                        "full_name": user.full_name
                    }
            
            enriched_chain.append(stage_data)
        
        return {
            "workflow_id": workflow.id,
            "loan_id": workflow.loan_id,
            "loan_number": loan.loan_number if loan else None,
            "borrower": loan.borrower.name if loan and loan.borrower else None,
            "workflow_type": workflow.workflow_type,
            "title": workflow.title,
            "description": workflow.description,
            "status": workflow.status,
            "current_stage": workflow.current_stage,
            "progress_percentage": progress_percentage,
            "approval_chain": enriched_chain,
            "initiated_by": {
                "id": initiator.id,
                "email": initiator.email,
                "full_name": initiator.full_name
            } if initiator else None,
            "created_date": workflow.created_date.isoformat(),
            "updated_date": workflow.updated_date.isoformat() if workflow.updated_date else None,
            "due_date": workflow.due_date.isoformat() if workflow.due_date else None,
            "completed_date": workflow.completed_date.isoformat() if workflow.completed_date else None,
            "metadata": workflow.metadata
        }
    
    def get_loan_workflows(self, loan_id: int) -> List[Dict]:
        """Get all workflows for a specific loan."""
        workflows = self.db.query(CollaborationWorkflow).filter(
            CollaborationWorkflow.loan_id == loan_id
        ).order_by(CollaborationWorkflow.created_date.desc()).all()
        
        return [
            {
                "workflow_id": wf.id,
                "workflow_type": wf.workflow_type,
                "title": wf.title,
                "status": wf.status,
                "current_stage": wf.current_stage,
                "created_date": wf.created_date.isoformat(),
                "due_date": wf.due_date.isoformat() if wf.due_date else None
            }
            for wf in workflows
        ]
    
    def add_comment_to_workflow(
        self,
        workflow_id: int,
        user_id: int,
        comment: str,
        stage_name: Optional[str] = None
    ) -> Dict:
        """Add comment to workflow or specific stage."""
        workflow = self.db.query(CollaborationWorkflow).filter(
            CollaborationWorkflow.id == workflow_id
        ).first()
        
        if not workflow:
            raise ValueError(f"Workflow with ID {workflow_id} not found")
        
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError(f"User with ID {user_id} not found")
        
        comment_data = {
            "user_id": user_id,
            "user_email": user.email,
            "user_name": user.full_name,
            "comment": comment,
            "timestamp": datetime.now().isoformat(),
            "stage": stage_name
        }
        
        # Add to metadata comments
        metadata = workflow.metadata or {}
        if "comments" not in metadata:
            metadata["comments"] = []
        metadata["comments"].append(comment_data)
        
        workflow.metadata = metadata
        workflow.updated_date = datetime.now()
        self.db.commit()
        
        return comment_data
