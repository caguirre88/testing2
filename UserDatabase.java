import java.io.*;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

public class UserDatabase {
    private final File dbFile;

    public UserDatabase(String path) {
        this.dbFile = new File(path);
        try {
            if (!dbFile.exists()) {
                File parent = dbFile.getParentFile();
                if (parent != null) {
                    parent.mkdirs();
                }
                dbFile.createNewFile();
            }
        } catch (IOException e) {
            throw new RuntimeException("Failed to initialize user database", e);
        }
    }

    public synchronized boolean registerUser(String username, String password) {
        if (findHashedPassword(username) != null) {
            return false; // user already exists
        }
        try (FileWriter fw = new FileWriter(dbFile, true)) {
            fw.write(username + ":" + hash(password) + System.lineSeparator());
            return true;
        } catch (IOException e) {
            return false;
        }
    }

    public synchronized boolean authenticate(String username, String password) {
        String stored = findHashedPassword(username);
        if (stored == null) {
            return false;
        }
        return stored.equals(hash(password));
    }

    private String findHashedPassword(String username) {
        if (!dbFile.exists()) {
            return null;
        }
        try (BufferedReader br = new BufferedReader(new FileReader(dbFile))) {
            String line;
            while ((line = br.readLine()) != null) {
                String[] parts = line.split(":" , 2);
                if (parts.length == 2 && parts[0].equals(username)) {
                    return parts[1];
                }
            }
        } catch (IOException e) {
            // ignore
        }
        return null;
    }

    private String hash(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] out = md.digest(input.getBytes());
            StringBuilder sb = new StringBuilder();
            for (byte b : out) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException(e);
        }
    }
}
