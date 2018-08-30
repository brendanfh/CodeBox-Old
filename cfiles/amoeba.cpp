#include <iostream>
#include <string>
using namespace std;

bool get(bool* chart, int w, int h, int x, int y) {
    if (x < 0 || y < 0 || x >= w || y >= h) return false;
    return chart[y * w + x];
}

bool move(bool* chart, int w, int h, int x, int y, int &tx, int &ty) {
    if (x < 0 || y < 0 || x >= w || y >= h) return false;
    if (chart[y * w + x]) {
        tx = x;
        ty = y;
        return true;
    }
    else {
        return false;
    }
}

int main()
{
    int m, n;
    cin >> m >> n;
    bool* chart = (bool*)calloc(m * n, sizeof(bool));

    string s;
    for (int i = 0; i < m; i++) {
        cin >> s;
        for (int j = 0; j < n; j++) {
            if (s[j] == '#') {
                chart[i * n + j] = true;
            }
        }
    }

    int loops = 0;
    for (int i = 0; i < m; i++) {
        for (int j = 0; j < n; j++) {
            if (!chart[i * n + j]) continue;

            int cx = j;
            int cy = i;
            int startx = j;
            int starty = i;

            int len = 0;
            while (true) {
                //if (startx != cx || starty != cy)
                chart[cy * n + cx] = false;
                len++;
                int adj = startx == cx && starty == cy ? 0 : 1;
                if (get(chart, n, m, cx + 0, cy + 1)) adj++;
                if (get(chart, n, m, cx + 1, cy + 1)) adj++;
                if (get(chart, n, m, cx + 1, cy + 0)) adj++;
                if (get(chart, n, m, cx - 1, cy + 0)) adj++;
                if (get(chart, n, m, cx - 1, cy - 1)) adj++;
                if (get(chart, n, m, cx + 0, cy - 1)) adj++;
                if (get(chart, n, m, cx + 1, cy - 1)) adj++;
                if (get(chart, n, m, cx - 1, cy + 1)) adj++;

                if (adj != 2) {
                    break;
                }

                int ty = 0;
                int tx = 0;

                if (move(chart, n, m, cx + 0, cy + 1, tx, ty));
                else if (move(chart, n, m, cx + 1, cy + 1, tx, ty));
                else if (move(chart, n, m, cx + 1, cy + 0, tx, ty));
                else if (move(chart, n, m, cx - 1, cy + 0, tx, ty));
                else if (move(chart, n, m, cx - 1, cy - 1, tx, ty));
                else if (move(chart, n, m, cx + 0, cy - 1, tx, ty));
                else if (move(chart, n, m, cx + 1, cy - 1, tx, ty));
                else if (move(chart, n, m, cx - 1, cy + 1, tx, ty));

                cx = tx;
                cy = ty;

                if (len > 1
                    && ((cx + 1 == startx && cy + 1 == starty)
                    ||  (cx + 1 == startx && cy + 0 == starty)
                    ||  (cx + 1 == startx && cy - 1 == starty)
                    ||  (cx + 0 == startx && cy + 1 == starty)
                    ||  (cx + 0 == startx && cy - 1 == starty)
                    ||  (cx - 1 == startx && cy + 1 == starty)
                    ||  (cx - 1 == startx && cy - 0 == starty)
                    ||  (cx - 1 == startx && cy - 1 == starty))) {
                    loops++;
                    break;
                }
            }
        }
    }

    cout << loops << endl;
    return 0;
}
