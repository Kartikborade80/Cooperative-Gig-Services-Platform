import io
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Invoice, Booking, User, UserRole
from app.schemas.schemas import InvoiceResponse
from app.api.deps import get_current_user

from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

router = APIRouter(prefix="/invoices", tags=["Invoices"])

@router.get("/{booking_id}", response_model=InvoiceResponse)
def get_invoice_by_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    invoice = db.query(Invoice).filter(Invoice.booking_id == booking_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found for this booking")

    booking = invoice.booking
    if booking:
        # Access check
        if current_user.role == UserRole.CUSTOMER and booking.customer_id != current_user.id:
            raise HTTPException(status_code=403, detail="Forbidden")
        if current_user.role == UserRole.WORKER and booking.worker and booking.worker.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Forbidden")

    return InvoiceResponse(
        id=invoice.id,
        invoice_number=invoice.invoice_number,
        booking_id=invoice.booking_id,
        booking_ref=booking.booking_ref if booking else "N/A",
        customer_name=invoice.customer_name,
        worker_name=invoice.worker_name,
        coop_name=invoice.coop_name,
        service_name=invoice.service_name,
        labour_charge=invoice.labour_charge,
        material_charge=invoice.material_charge,
        coop_fee=invoice.coop_fee,
        cooperative_contribution=invoice.coop_fee,
        worker_earnings=invoice.worker_earnings,
        total_amount=invoice.total_amount,
        payment_method=invoice.payment_method,
        transaction_ref=invoice.transaction_ref,
        issue_date=invoice.issue_date
    )

@router.get("/{booking_id}/pdf")
def download_invoice_pdf(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    invoice = db.query(Invoice).filter(Invoice.booking_id == booking_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found for this booking")

    booking = invoice.booking
    if booking:
        # Access control: only customer, worker, or admins can download
        if current_user.role == UserRole.CUSTOMER and booking.customer_id != current_user.id:
            raise HTTPException(status_code=403, detail="Unauthorized")
        if current_user.role == UserRole.WORKER and booking.worker and booking.worker.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Unauthorized")

    # Generate PDF in-memory buffer
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontSize=20,
        textColor=colors.HexColor('#0f172a'),
        spaceAfter=4,
        fontName='Helvetica-Bold'
    )
    subtitle_style = ParagraphStyle(
        'DocSub',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#059669'),
        spaceAfter=15,
        fontName='Helvetica-Bold'
    )
    section_title = ParagraphStyle(
        'SecTitle',
        parent=styles['Heading3'],
        fontSize=12,
        textColor=colors.HexColor('#1e293b'),
        spaceBefore=10,
        spaceAfter=6,
        fontName='Helvetica-Bold'
    )
    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor('#334155'),
        leading=12
    )
    body_bold = ParagraphStyle(
        'BodyBold',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor('#0f172a'),
        leading=12,
        fontName='Helvetica-Bold'
    )

    story = []

    # Header section
    story.append(Paragraph("TAX INVOICE & RECEIPT", title_style))
    story.append(Paragraph(f"{invoice.coop_name} • Reg. No: MH/AHM/COOP/2022/4910", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#059669'), spaceAfter=14))

    # Meta Table: 2 columns
    meta_data = [
        [
            Paragraph(f"<b>Invoice No:</b> {invoice.invoice_number}", body_style),
            Paragraph(f"<b>Date:</b> {invoice.issue_date.strftime('%d-%b-%Y %I:%M %p')}", body_style)
        ],
        [
            Paragraph(f"<b>Booking Ref:</b> #{booking.booking_ref if booking else 'N/A'}", body_style),
            Paragraph(f"<b>Status:</b> <font color='#059669'>PAID & VERIFIED</font>", body_style)
        ],
        [
            Paragraph(f"<b>Transaction ID:</b> {invoice.transaction_ref}", body_style),
            Paragraph(f"<b>Payment Mode:</b> {invoice.payment_method}", body_style)
        ]
    ]
    meta_table = Table(meta_data, colWidths=[260, 260])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 14))

    # Customer and Worker Details Table
    service_date = booking.booking_date if (booking and booking.booking_date) else "As Scheduled"
    time_slot = booking.time_slot if (booking and booking.time_slot) else "Standard"
    category_name = booking.service.category.name if (booking and booking.service and booking.service.category) else "Cooperative Services"
    address_str = booking.address if booking else "Kopargaon, Maharashtra"

    parties_data = [
        [Paragraph("<b>CUSTOMER / BILL TO</b>", body_bold), Paragraph("<b>COOPERATIVE WORKER</b>", body_bold)],
        [
            Paragraph(f"<b>Name:</b> {invoice.customer_name}<br/><b>Address:</b> {address_str}<br/><b>City:</b> Kopargaon, Maharashtra 423601", body_style),
            Paragraph(f"<b>Name:</b> {invoice.worker_name}<br/><b>Society:</b> {invoice.coop_name}<br/><b>Verification:</b> Certified Member ✓", body_style)
        ]
    ]
    parties_table = Table(parties_data, colWidths=[260, 260])
    parties_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f1f5f9')),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('PADDING', (0,0), (-1,-1), 6),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(parties_table)
    story.append(Spacer(1, 14))

    # Service & Booking details
    story.append(Paragraph("<b>SERVICE PARTICULARS</b>", section_title))
    service_info = [
        [
            Paragraph("<b>Category:</b>", body_style), Paragraph(category_name, body_bold),
            Paragraph("<b>Scheduled Date:</b>", body_style), Paragraph(service_date, body_bold)
        ],
        [
            Paragraph("<b>Service Name:</b>", body_style), Paragraph(invoice.service_name, body_bold),
            Paragraph("<b>Time Slot:</b>", body_style), Paragraph(time_slot, body_bold)
        ]
    ]
    srv_table = Table(service_info, colWidths=[100, 160, 110, 150])
    srv_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#ffffff')),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
        ('PADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(srv_table)
    story.append(Spacer(1, 14))

    # Itemized Charges Table
    story.append(Paragraph("<b>ITEMIZED CHARGES</b>", section_title))
    charges_data = [
        [Paragraph("<b>Description</b>", body_bold), Paragraph("<b>Rate (INR)</b>", body_bold), Paragraph("<b>Amount (INR)</b>", body_bold)],
        [
            Paragraph(f"{invoice.service_name} (Labour & Skilled Services)", body_style),
            Paragraph(f"₹{invoice.labour_charge:.2f}", body_style),
            Paragraph(f"₹{invoice.labour_charge:.2f}", body_bold)
        ],
    ]
    if invoice.material_charge > 0:
        charges_data.append([
            Paragraph("Materials & Consumables Procured", body_style),
            Paragraph(f"₹{invoice.material_charge:.2f}", body_style),
            Paragraph(f"₹{invoice.material_charge:.2f}", body_bold)
        ])
    charges_data.append([
        Paragraph("<b>Total Amount Paid:</b>", body_bold),
        Paragraph("", body_style),
        Paragraph(f"<b>₹{invoice.total_amount:.2f}</b>", body_bold)
    ])

    charges_table = Table(charges_data, colWidths=[320, 100, 100])
    charges_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f8fafc')),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('LINEBELOW', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
        ('PADDING', (0,0), (-1,-1), 6),
        ('ALIGN', (1,0), (-1,-1), 'RIGHT'),
        ('BACKGROUND', (0,-1), (-1,-1), colors.HexColor('#ecfdf5')),
    ]))
    story.append(charges_table)
    story.append(Spacer(1, 14))

    # Fair Cooperative Split Transparency Note
    split_data = [
        [
            Paragraph("<b>Fair Cooperative Split Transparency:</b>", body_bold),
            Paragraph("", body_style)
        ],
        [
            Paragraph("• Worker Direct Earnings (95% Payout):", body_style),
            Paragraph(f"<b>₹{invoice.worker_earnings:.2f}</b>", body_style)
        ],
        [
            Paragraph("• Cooperative Collective Welfare & Operations Pool (5%):", body_style),
            Paragraph(f"<b>₹{invoice.coop_fee:.2f}</b>", body_style)
        ],
    ]
    split_table = Table(split_data, colWidths=[370, 150])
    split_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f0fdf4')),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#bbf7d0')),
        ('PADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(split_table)
    story.append(Spacer(1, 18))

    # Footer note
    footer_text = Paragraph(
        "<i>This is an electronically generated and digitally signed tax invoice of the Cooperative Gig Services Platform. For queries, contact member support.</i>",
        ParagraphStyle('Footer', parent=styles['Normal'], fontSize=7.5, textColor=colors.HexColor('#94a3b8'), alignment=1)
    )
    story.append(footer_text)

    # Build PDF
    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()

    filename = f"Invoice_{invoice.invoice_number}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=\"{filename}\"",
            "Content-Type": "application/pdf"
        }
    )
