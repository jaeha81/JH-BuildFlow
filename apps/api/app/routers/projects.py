"""프로젝트 CRUD + 공종 패키지 + 문서 관리."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import write_audit
from app.core.database import get_db
from app.core.upload import save_upload
from app.dependencies.auth import get_current_user, require_roles
from app.models.base import new_uuid
from app.models.project import ProcessPackage, Project, ProjectDocument
from app.models.user import User
from app.schemas.projects import (
    DocumentResponse,
    PackageCreate,
    PackageResponse,
    PackageUpdate,
    ProjectCreate,
    ProjectResponse,
    ProjectUpdate,
)

router = APIRouter(prefix="/projects", tags=["projects"])

ADMIN_ROLES = ("super_admin", "sub_admin", "site_manager")


# ─── Projects ─────────────────────────────────────────────────────────────────

@router.get("", response_model=list[ProjectResponse])
async def list_projects(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ProjectResponse]:
    result = await db.execute(
        select(Project)
        .where(Project.company_id == current_user.company_id, Project.deleted_at.is_(None))
        .offset(skip)
        .limit(limit)
    )
    return [ProjectResponse.model_validate(p) for p in result.scalars()]


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    body: ProjectCreate,
    request: Request,
    current_user: User = Depends(require_roles(*ADMIN_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> ProjectResponse:
    project = Project(
        id=new_uuid(),
        company_id=current_user.company_id,
        **body.model_dump(),
    )
    db.add(project)
    await write_audit(
        db,
        company_id=current_user.company_id,
        actor_id=current_user.id,
        actor_role=current_user.role,
        action="project.create",
        target_type="Project",
        target_id=project.id,
        after=body.model_dump(),
        request=request,
    )
    await db.commit()
    await db.refresh(project)
    return ProjectResponse.model_validate(project)


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProjectResponse:
    project = await _get_project_or_404(db, project_id, current_user.company_id)
    return ProjectResponse.model_validate(project)


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    body: ProjectUpdate,
    request: Request,
    current_user: User = Depends(require_roles(*ADMIN_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> ProjectResponse:
    project = await _get_project_or_404(db, project_id, current_user.company_id)
    before = ProjectResponse.model_validate(project).model_dump()
    for field, val in body.model_dump(exclude_none=True).items():
        setattr(project, field, val)
    await write_audit(
        db,
        company_id=current_user.company_id,
        actor_id=current_user.id,
        actor_role=current_user.role,
        action="project.update",
        target_type="Project",
        target_id=project_id,
        before=before,
        after=body.model_dump(exclude_none=True),
        request=request,
    )
    await db.commit()
    await db.refresh(project)
    return ProjectResponse.model_validate(project)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: str,
    request: Request,
    current_user: User = Depends(require_roles("super_admin", "sub_admin")),
    db: AsyncSession = Depends(get_db),
) -> None:
    project = await _get_project_or_404(db, project_id, current_user.company_id)
    project.deleted_at = datetime.now(timezone.utc)
    await write_audit(
        db,
        company_id=current_user.company_id,
        actor_id=current_user.id,
        actor_role=current_user.role,
        action="project.delete",
        target_type="Project",
        target_id=project_id,
        request=request,
    )
    await db.commit()


# ─── Process Packages ─────────────────────────────────────────────────────────

@router.get("/{project_id}/process-packages", response_model=list[PackageResponse])
async def list_packages(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[PackageResponse]:
    await _get_project_or_404(db, project_id, current_user.company_id)
    result = await db.execute(
        select(ProcessPackage).where(
            ProcessPackage.project_id == project_id,
            ProcessPackage.deleted_at.is_(None),
        )
    )
    return [PackageResponse.model_validate(p) for p in result.scalars()]


@router.post(
    "/{project_id}/process-packages",
    response_model=PackageResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_package(
    project_id: str,
    body: PackageCreate,
    request: Request,
    current_user: User = Depends(require_roles(*ADMIN_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> PackageResponse:
    await _get_project_or_404(db, project_id, current_user.company_id)
    pkg = ProcessPackage(
        id=new_uuid(),
        company_id=current_user.company_id,
        project_id=project_id,
        **body.model_dump(),
    )
    db.add(pkg)
    await write_audit(
        db,
        company_id=current_user.company_id,
        actor_id=current_user.id,
        actor_role=current_user.role,
        action="package.create",
        target_type="ProcessPackage",
        target_id=pkg.id,
        after=body.model_dump(),
        request=request,
    )
    await db.commit()
    await db.refresh(pkg)
    return PackageResponse.model_validate(pkg)


@router.put("/{project_id}/process-packages/{pkg_id}", response_model=PackageResponse)
async def update_package(
    project_id: str,
    pkg_id: str,
    body: PackageUpdate,
    request: Request,
    current_user: User = Depends(require_roles(*ADMIN_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> PackageResponse:
    pkg = await _get_package_or_404(db, pkg_id, project_id)
    for field, val in body.model_dump(exclude_none=True).items():
        setattr(pkg, field, val)
    await write_audit(
        db,
        company_id=current_user.company_id,
        actor_id=current_user.id,
        actor_role=current_user.role,
        action="package.update",
        target_type="ProcessPackage",
        target_id=pkg_id,
        after=body.model_dump(exclude_none=True),
        request=request,
    )
    await db.commit()
    await db.refresh(pkg)
    return PackageResponse.model_validate(pkg)


# ─── Documents ────────────────────────────────────────────────────────────────

@router.get("/{project_id}/documents", response_model=list[DocumentResponse])
async def list_documents(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[DocumentResponse]:
    await _get_project_or_404(db, project_id, current_user.company_id)
    result = await db.execute(
        select(ProjectDocument).where(
            ProjectDocument.project_id == project_id,
            ProjectDocument.deleted_at.is_(None),
        )
    )
    docs = list(result.scalars())
    # SECURITY: vendor_user는 is_internal=True 문서 접근 불가
    if current_user.role == "vendor_user":
        docs = [d for d in docs if not d.is_internal]
    return [DocumentResponse.model_validate(d) for d in docs]


@router.post(
    "/{project_id}/documents",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_document(
    project_id: str,
    doc_type: str = "general",
    folder_key: str | None = None,
    file: UploadFile = File(...),
    request: Request = None,
    current_user: User = Depends(require_roles(*ADMIN_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> DocumentResponse:
    await _get_project_or_404(db, project_id, current_user.company_id)
    file_url, file_name = await save_upload(file, base_dir="uploads/documents")
    doc = ProjectDocument(
        id=new_uuid(),
        company_id=current_user.company_id,
        project_id=project_id,
        doc_type=doc_type,
        file_url=file_url,
        file_name=file_name,
        folder_key=folder_key,
    )
    db.add(doc)
    await write_audit(
        db,
        company_id=current_user.company_id,
        actor_id=current_user.id,
        actor_role=current_user.role,
        action="document.upload",
        target_type="ProjectDocument",
        target_id=doc.id,
        after={"file_name": file_name, "doc_type": doc_type},
        request=request,
    )
    await db.commit()
    await db.refresh(doc)
    return DocumentResponse.model_validate(doc)


# ─── Helpers ──────────────────────────────────────────────────────────────────

async def _get_project_or_404(db: AsyncSession, project_id: str, company_id: str) -> Project:
    result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.company_id == company_id,
            Project.deleted_at.is_(None),
        )
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="프로젝트를 찾을 수 없습니다.")
    return project


async def _get_package_or_404(db: AsyncSession, pkg_id: str, project_id: str) -> ProcessPackage:
    result = await db.execute(
        select(ProcessPackage).where(
            ProcessPackage.id == pkg_id,
            ProcessPackage.project_id == project_id,
            ProcessPackage.deleted_at.is_(None),
        )
    )
    pkg = result.scalar_one_or_none()
    if not pkg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="패키지를 찾을 수 없습니다.")
    return pkg
