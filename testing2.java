import javax.swing.*;
import java.awt.*;

public class testing2 {
    private static final boolean DEBUG = true;

    public static void main(String[] args) {
        try {
            SwingUtilities.invokeLater(() -> createAndShowGui(args));
        } catch (Exception e) {
            if (DEBUG) {
                e.printStackTrace();
            }
        }
    }

    private static void createAndShowGui(String[] args) {
        JFrame frame = new JFrame("Testing2 GUI");
        frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        frame.setSize(300, 200);
        String message = args.length > 0 ? args[0] : "Testing2";
        JLabel label = new JLabel(message, SwingConstants.CENTER);
        JButton button = new JButton("Click Me");
        button.addActionListener(e -> {
            if (DEBUG) {
                System.out.println("Button clicked");
            }
            JOptionPane.showMessageDialog(frame, "Hello from Testing2!");
        });
        frame.getContentPane().add(label, BorderLayout.CENTER);
        frame.getContentPane().add(button, BorderLayout.SOUTH);
        frame.setLocationRelativeTo(null);
        frame.setVisible(true);
    }
}
