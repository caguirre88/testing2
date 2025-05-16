import javax.swing.*;
import java.awt.*;

public class testing2 {
    private static final boolean DEBUG = true;

    public static void main(String[] args) {
        try {
            SwingUtilities.invokeLater(testing2::createAndShowGui);
        } catch (Exception e) {
            if (DEBUG) {
                e.printStackTrace();
            }
        }
    }

    private static void createAndShowGui() {
        JFrame frame = new JFrame("Testing2 GUI");
        frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        frame.setSize(300, 200);

        JPanel panel = new JPanel(new BorderLayout());
        JTextField inputField = new JTextField();
        JButton computeButton = new JButton("Compute Fibonacci");
        JLabel resultLabel =
                new JLabel("Enter a number", SwingConstants.CENTER);

        computeButton.addActionListener(e -> {
            String text = inputField.getText();
            try {
                int n = Integer.parseInt(text.trim());
                long result = FibonacciDP.fib(n);
                resultLabel.setText("Fib(" + n + ") = " + result);
                if (DEBUG) {
                    System.out.println("Computed Fib(" + n + ") = " + result);
                }
            } catch (Exception ex) {
                resultLabel.setText("Invalid input");
                if (DEBUG) {
                    ex.printStackTrace();
                }
            }
        });

        panel.add(inputField, BorderLayout.NORTH);
        panel.add(computeButton, BorderLayout.CENTER);
        panel.add(resultLabel, BorderLayout.SOUTH);

        frame.getContentPane().add(panel);
        frame.setLocationRelativeTo(null);
        frame.setVisible(true);
    }
}
