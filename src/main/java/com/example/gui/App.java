package com.example.gui;

import javax.swing.*;
import java.awt.*;
import com.example.dp.FibonacciDP;

public class App {
    private static final boolean DEBUG = true;

    public static void main(String[] args) {
        try {
            SwingUtilities.invokeLater(App::createGui);
        } catch (Exception e) {
            if (DEBUG) {
                e.printStackTrace();
            }
        }
    }

    private static void createGui() {
        JFrame frame = new JFrame("Fibonacci Calculator");
        frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        frame.setSize(400, 200);

        JPanel panel = new JPanel(new BorderLayout());
        JTextField inputField = new JTextField();
        JButton computeButton = new JButton("Compute");
        JLabel resultLabel = new JLabel("Result:");

        computeButton.addActionListener(e -> {
            try {
                int n = Integer.parseInt(inputField.getText());
                int result = FibonacciDP.compute(n);
                resultLabel.setText("Result: " + result);
                if (DEBUG) {
                    System.out.println("Computed Fib(" + n + ") = " + result);
                }
            } catch (NumberFormatException ex) {
                JOptionPane.showMessageDialog(frame, "Please enter a valid integer.");
                if (DEBUG) {
                    ex.printStackTrace();
                }
            } catch (Exception ex) {
                JOptionPane.showMessageDialog(frame, "Error: " + ex.getMessage());
                if (DEBUG) {
                    ex.printStackTrace();
                }
            }
        });

        panel.add(inputField, BorderLayout.NORTH);
        panel.add(computeButton, BorderLayout.CENTER);
        panel.add(resultLabel, BorderLayout.SOUTH);

        frame.setContentPane(panel);
        frame.setLocationRelativeTo(null);
        frame.setVisible(true);
    }
}
