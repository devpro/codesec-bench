package com.example.reporting.safe;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.List;
import javax.sql.DataSource;
import org.springframework.stereotype.Repository;

/**
 * Correct counterpart of ReportRepository.
 *
 * Same driver, same query, same names.
 * The owner is bound as a parameter rather than concatenated into the statement.
 *
 * Any finding reported in this file is a false positive.
 */
@Repository
public class SafeReportRepository {

    private final DataSource dataSource;

    public SafeReportRepository(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    public List<String> findByOwner(String owner) throws Exception {
        List<String> titles = new ArrayList<>();

        String sql = "SELECT title FROM reports WHERE owner = ?";

        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {

            statement.setString(1, owner);
            ResultSet results = statement.executeQuery();

            while (results.next()) {
                titles.add(results.getString("title"));
            }
        }

        return titles;
    }
}
