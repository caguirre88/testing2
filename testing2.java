import javax.swing.*;
import java.awt.*;

public class testing2 {
    private static final boolean DEBUG = true;
    private static final UserDatabase DB = new UserDatabase("data/users.txt");

    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> {
            try {
                showLogin();
            } catch (Exception e) {
                if (DEBUG) {
                    e.printStackTrace();
                }
            }
        });
    }

    private static void showLogin() {
        JFrame frame = new JFrame("Login");
        frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        frame.setSize(300, 150);

        JPanel panel = new JPanel(new GridLayout(3, 2));
        JTextField userField = new JTextField();
        JPasswordField passField = new JPasswordField();
        panel.add(new JLabel("Username:"));
        panel.add(userField);
        panel.add(new JLabel("Password:"));
        panel.add(passField);

        JButton loginBtn = new JButton("Login");
        JButton registerBtn = new JButton("Register");
        panel.add(loginBtn);
        panel.add(registerBtn);

        loginBtn.addActionListener(e -> {
            String user = userField.getText().trim();
            String pass = new String(passField.getPassword());
            if (DB.authenticate(user, pass)) {
                if (DEBUG) {
                    System.out.println("User " + user + " logged in");
                }
                JOptionPane.showMessageDialog(frame, "Login successful");
                frame.dispose();
                showMainApp(user);
            } else {
                JOptionPane.showMessageDialog(frame, "Invalid credentials", "Error", JOptionPane.ERROR_MESSAGE);
            }
        });

        registerBtn.addActionListener(e -> {
            String user = userField.getText().trim();
            String pass = new String(passField.getPassword());
            if (user.isEmpty() || pass.isEmpty()) {
                JOptionPane.showMessageDialog(frame, "Enter username and password", "Error", JOptionPane.ERROR_MESSAGE);
                return;
            }
            if (DB.registerUser(user, pass)) {
                JOptionPane.showMessageDialog(frame, "User registered, please log in");
            } else {
                JOptionPane.showMessageDialog(frame, "User already exists", "Error", JOptionPane.ERROR_MESSAGE);
            }
        });

        frame.getContentPane().add(panel);
        frame.setLocationRelativeTo(null);
        frame.setVisible(true);
    }

    private static void showMainApp(String user) {
        JFrame frame = new JFrame("Testing2 App");
        frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        frame.setSize(300, 200);

        JLabel label = new JLabel("Hello, " + user + "!", SwingConstants.CENTER);
        frame.getContentPane().add(label);
        frame.setLocationRelativeTo(null);
        frame.setVisible(true);
    }
}
