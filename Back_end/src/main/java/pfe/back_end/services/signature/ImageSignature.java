package pfe.back_end.services.signature;

import com.itextpdf.io.font.constants.StandardFonts;
import com.itextpdf.io.image.ImageData;
import com.itextpdf.io.image.ImageDataFactory;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.font.PdfFont;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfReader;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.Border;
import com.itextpdf.layout.borders.SolidBorder;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Image;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.HorizontalAlignment;
import com.itextpdf.layout.properties.TextAlignment;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import pfe.back_end.services.notification.ServiceSmsOtp;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Base64;


@Service
public class ImageSignature {


    @Autowired
    private ServiceSmsOtp serviceSmsOtp;


    private static final float SIGNATURE_WIDTH = 180;


    public  byte[] ajouterSignatureImage(byte[] pdfOriginal, String base64Image,
                                         String nomSignataire, String telephone,
                                         int targetPage, float x, float y) throws Exception {

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        PdfReader reader = new PdfReader(new ByteArrayInputStream(pdfOriginal));
        PdfWriter writer = new PdfWriter(out);
        PdfDocument pdfDoc = new PdfDocument(reader, writer);

        // On utilise le Document iText pour le placement d'objets de haut niveau
        Document layoutDocument = new Document(pdfDoc);
        layoutDocument.setMargins(0, 0, 0, 0);

        // Décoder l'image de signature
        String cleanBase64 = base64Image.contains(",") ? base64Image.split(",")[1] : base64Image;
        byte[] imageBytes = Base64.getDecoder().decode(cleanBase64);
        ImageData imageData = ImageDataFactory.create(imageBytes);
        Image img = new Image(imageData);
        img.scaleToFit(100, 50);
        img.setHorizontalAlignment(HorizontalAlignment.CENTER);

        // Créer la table visuelle de signature
        Table signatureTable = new Table(1);
        signatureTable.setWidth(SIGNATURE_WIDTH);

        // FORCER LA POSITION SUR LA PAGE CIBLE
        signatureTable.setFixedPosition(targetPage, x, y, SIGNATURE_WIDTH);

        signatureTable.setBorder(new SolidBorder(ColorConstants.BLACK, 0.5f));
        signatureTable.setBackgroundColor(ColorConstants.WHITE);
        signatureTable.setKeepTogether(true);

        // Design de la table (En-tête)
        PdfFont boldFont = PdfFontFactory.createFont(StandardFonts.HELVETICA_BOLD);
        PdfFont normalFont = PdfFontFactory.createFont(StandardFonts.HELVETICA);

        signatureTable.addCell(new Cell().add(new Paragraph("SIGNATURE TRUSTSIGN")
                        .setFont(boldFont).setFontSize(8).setTextAlignment(TextAlignment.CENTER))
                .setBorder(Border.NO_BORDER).setBackgroundColor(new DeviceRgb(240, 248, 255)));

        // Ajout de l'image de signature
        signatureTable.addCell(new Cell().add(img)
                .setBorder(Border.NO_BORDER).setPaddingTop(5).setPaddingBottom(5));

        // Ajout des informations textuelles
        String dateTime = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
        Paragraph info = new Paragraph(nomSignataire + "\n" + dateTime + "\nOTP: " + telephone)
                .setFont(normalFont).setFontSize(7).setTextAlignment(TextAlignment.CENTER).setMultipliedLeading(1.0f);

        signatureTable.addCell(new Cell().add(info).setBorder(Border.NO_BORDER));

        // Ajout final à la page spécifique
        layoutDocument.add(signatureTable);
        layoutDocument.close();

        return out.toByteArray();
    }





    public  byte[] ajouterSignatureImageDepuisByte(byte[] pdfOriginal, byte[] imageBytes,
                                                   String nomSignataire, int targetPage,
                                                   float x, float y) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        PdfDocument pdfDoc = new PdfDocument(new PdfReader(new ByteArrayInputStream(pdfOriginal)), new PdfWriter(out));
        Document layoutDocument = new Document(pdfDoc);

        ImageData imageData = ImageDataFactory.create(imageBytes);
        Image img = new Image(imageData).scaleToFit(100, 50).setHorizontalAlignment(HorizontalAlignment.CENTER);

        Table signatureTable = new Table(1).setWidth(SIGNATURE_WIDTH).setFixedPosition(targetPage, x, y, SIGNATURE_WIDTH);
        signatureTable.setBorder(new SolidBorder(ColorConstants.BLACK, 0.5f)).setBackgroundColor(ColorConstants.WHITE);

        String dateTime = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
        Paragraph info = new Paragraph("AUTO-SIGNATURE TRUSTSIGN\n" + nomSignataire + "\n" + dateTime)
                .setFontSize(7).setTextAlignment(TextAlignment.CENTER);

        signatureTable.addCell(new Cell().add(img).setBorder(Border.NO_BORDER));
        signatureTable.addCell(new Cell().add(info).setBorder(Border.NO_BORDER));

        layoutDocument.add(signatureTable);
        layoutDocument.close();
        return out.toByteArray();
    }
}
