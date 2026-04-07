package pfe.back_end.services.preuve;

import com.itextpdf.io.image.ImageData;
import com.itextpdf.io.image.ImageDataFactory;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.pdf.*;
import com.itextpdf.kernel.pdf.canvas.PdfCanvas;
import com.itextpdf.layout.element.*;
import com.itextpdf.layout.properties.*;
import com.itextpdf.kernel.font.*;
import com.itextpdf.io.font.constants.StandardFonts;
import java.util.Base64;
import org.springframework.stereotype.Service;
import pfe.back_end.modeles.entites.Document;
import pfe.back_end.services.authentification.ConvertisseurCoordonneesPdf;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;


/*
@Service
public class ServicePreuvePdf {

    public byte[] genererPdfPreuve(Document doc) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        PdfWriter writer = new PdfWriter(out);
        PdfDocument pdfDoc = new PdfDocument(writer);
        pdfDoc.setDefaultPageSize(PageSize.A4);
        com.itextpdf.layout.Document pdfDocument = new com.itextpdf.layout.Document(pdfDoc);

        addElegantBorder(pdfDoc);

        PdfFont bold = PdfFontFactory.createFont(StandardFonts.HELVETICA_BOLD);
        PdfFont normal = PdfFontFactory.createFont(StandardFonts.HELVETICA);
        PdfFont mono = PdfFontFactory.createFont(StandardFonts.COURIER);

        pdfDocument.add(new Paragraph("TRUSTSIGN").setFont(bold).setFontSize(22).setFontColor(new DeviceRgb(70,130,180)));
        pdfDocument.add(new Paragraph("Solution de signature numérique certifiée ISO 27001").setFont(normal).setFontSize(10).setFontColor(ColorConstants.GRAY));

        pdfDocument.add(new Paragraph("\nCERTIFICAT DE PREUVE\n").setFont(bold).setFontSize(26).setTextAlignment(TextAlignment.CENTER).setFontColor(new DeviceRgb(25,25,112)));

        pdfDocument.add(new Paragraph("✓ SIGNÉ ET SÉCURISÉ")
                .setFont(bold).setFontSize(12)
                .setBackgroundColor(new DeviceRgb(230,255,230))
                .setFontColor(new DeviceRgb(34,139,34))
                .setTextAlignment(TextAlignment.CENTER).setPadding(10).setWidth(200).setHorizontalAlignment(HorizontalAlignment.CENTER));

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss");
        Table table = new Table(2).useAllAvailableWidth().setMarginTop(20);
        addRow(table, "ID de transaction", doc.getId().toString(), bold, normal);
        addRow(table, "Nom du document", doc.getNomFichier(), bold, normal);
        addRow(table, "Signataire", doc.getProprietaire().getPrenom() + " " + doc.getProprietaire().getNom(), bold, normal);
        addRow(table, "Horodatage", doc.getDateCreation().format(formatter), bold, normal);
        pdfDocument.add(table);

        pdfDocument.add(new Paragraph("\nEMPREINTE NUMÉRIQUE (SHA-256)").setFont(bold).setFontSize(12));
        pdfDocument.add(new Paragraph(doc.getHashSha256()).setFont(mono).setFontSize(9).setBackgroundColor(new DeviceRgb(245,245,245)).setPadding(10));

        pdfDocument.add(new Paragraph("\nSIGNATURE NUMÉRIQUE").setFont(bold).setFontSize(12));
        String sig = doc.getSignatureNumerique();
        String display = sig.substring(0, Math.min(sig.length(), 100)) + "...";
        pdfDocument.add(new Paragraph(display).setFont(mono).setFontSize(8));

        pdfDocument.add(new Paragraph("\n\nCe document est une preuve technique générée par TrustSign.").setFont(normal).setFontSize(8).setFontColor(ColorConstants.GRAY).setTextAlignment(TextAlignment.CENTER));

        pdfDocument.close();
        return out.toByteArray();
    }

    private void addRow(Table table, String label, String value, PdfFont bold, PdfFont normal) {
        table.addCell(new Cell().add(new Paragraph(label).setFont(bold).setFontSize(10)));
        table.addCell(new Cell().add(new Paragraph(value).setFont(normal).setFontSize(10)));
    }

    private void addElegantBorder(PdfDocument pdfDoc) {
        PdfPage page = pdfDoc.addNewPage();
        PdfCanvas canvas = new PdfCanvas(page);
        canvas.setLineWidth(1.5f);
        canvas.setStrokeColor(new DeviceRgb(70,130,180));
        canvas.rectangle(20, 20, PageSize.A4.getWidth() - 40, PageSize.A4.getHeight() - 40);
        canvas.stroke();
    }

    public byte[] incrusterImage(byte[] pdfOriginal, String base64Image, String nomSignataire,
                                 float x, float y, int pageNumber, float displayWidth, float displayHeight) throws Exception {

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        PdfReader reader = new PdfReader(new ByteArrayInputStream(pdfOriginal));
        PdfWriter writer = new PdfWriter(out);
        PdfDocument pdfDoc = new PdfDocument(reader, writer);
        com.itextpdf.layout.Document document = new com.itextpdf.layout.Document(pdfDoc);

        int targetPage = (pageNumber > pdfDoc.getNumberOfPages() || pageNumber < 1) ? 1 : pageNumber;
        PdfPage page = pdfDoc.getPage(targetPage);
        float pdfWidth = page.getPageSize().getWidth();
        float pdfHeight = page.getPageSize().getHeight();

        float[] coords = ConvertisseurCoordonneesPdf.versEspacePdf(x, y, pdfWidth, pdfHeight, displayWidth, displayHeight);
        float finalX = coords[0];
        float finalY = coords[1];

        ImageData imageData = ImageDataFactory.create(
                Base64.getDecoder().decode(base64Image.contains(",") ? base64Image.split(",")[1] : base64Image)
        );
        Image img = new Image(imageData).scaleToFit(50, 25);

        Table etiquette = new Table(1).setWidth(130);
        etiquette.setFixedPosition(targetPage, finalX - 65, finalY - 35, 130);
        etiquette.setBorder(new com.itextpdf.layout.borders.SolidBorder(ColorConstants.GRAY, 0.5f));
        etiquette.setBackgroundColor(ColorConstants.WHITE);

        etiquette.addCell(new Cell().add(new Paragraph("Signé par : " + nomSignataire).setFontSize(6).setBold()));
        etiquette.addCell(new Cell().add(img.setHorizontalAlignment(HorizontalAlignment.CENTER)));

        document.add(etiquette);
        document.close();
        return out.toByteArray();
    }
}*/